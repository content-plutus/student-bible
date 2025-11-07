import { createClient } from "@supabase/supabase-js";
import { DynamicCsvParser } from "../src/lib/utils/csvParser";
import { readFileSync } from "fs";
import { join } from "path";

interface ImportOptions {
  csvFilePath: string;
  targetTable: string;
  batchSize?: number;
  dryRun?: boolean;
  fieldMappingRules?: Record<string, string>;
}

function loadEnvFile(): Record<string, string> {
  try {
    const envPath = join(__dirname, "..", ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const envVars: Record<string, string> = {};

    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    return envVars;
  } catch (error) {
    console.error("Error reading .env.local file:", (error as Error).message);
    return {};
  }
}

const env = loadEnvFile();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importHistoricalData(options: ImportOptions): Promise<void> {
  console.log("🚀 Starting Historical CSV Import Process...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📂 CSV File: ${options.csvFilePath}`);
  console.log(`🎯 Target Table: ${options.targetTable}`);
  console.log(`📦 Batch Size: ${options.batchSize || 500}`);
  console.log(`🔍 Dry Run: ${options.dryRun ? "YES" : "NO"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const parser = new DynamicCsvParser({
      targetTable: options.targetTable,
      batchSize: options.batchSize || 500,
      fieldMappingRules: options.fieldMappingRules,
    });

    console.log("📊 Parsing CSV file...");
    const parseResult = await parser.parseAndTransform(options.csvFilePath);

    console.log(`✅ Parsed ${parseResult.records.length} valid records`);

    if (parseResult.unmappedColumns.length > 0) {
      console.log(
        `\n⚠️  Found ${parseResult.unmappedColumns.length} unmapped columns (will be stored in JSONB):`,
      );
      parseResult.unmappedColumns.forEach((col) => console.log(`  - ${col}`));
    }

    if (parseResult.errors.length > 0) {
      console.warn(`\n⚠️  Found ${parseResult.errors.length} validation errors:`);
      parseResult.errors.slice(0, 10).forEach((err) => {
        console.warn(`  - Row ${err.row}, Column ${err.column}: ${err.message}`);
      });
      if (parseResult.errors.length > 10) {
        console.warn(`  ... and ${parseResult.errors.length - 10} more errors`);
      }
    }

    if (parseResult.records.length === 0) {
      console.error(
        "\n❌ No valid records to import. Please check your CSV file and validation errors.",
      );
      process.exit(1);
    }

    if (options.dryRun) {
      console.log("\n🔍 DRY RUN MODE - No data will be inserted");
      console.log("\nSample record structure:");
      console.log(JSON.stringify(parseResult.records[0], null, 2));
      console.log(
        `\n✨ Dry run completed. ${parseResult.records.length} records would be imported.`,
      );
      return;
    }

    console.log("\n💾 Inserting records into database...");
    const startTime = Date.now();

    let successCount = 0;
    let failCount = 0;
    const insertErrors: Array<{ record: number; error: string }> = [];

    const batchSize = options.batchSize || 500;
    const totalBatches = Math.ceil(parseResult.records.length / batchSize);

    for (let i = 0; i < parseResult.records.length; i += batchSize) {
      const batch = parseResult.records.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      const insertData = batch.map((record) => {
        const data: Record<string, unknown> = {
          ...record.structuredFields,
        };

        const jsonbColumn = parser.getJsonbColumn();
        if (Object.keys(record.jsonbFields).length > 0) {
          data[jsonbColumn] = record.jsonbFields;
        }

        return data;
      });

      try {
        const { error } = await supabase.from(options.targetTable).insert(insertData).select("id");

        if (error) throw error;

        successCount += batch.length;
        const progress = ((successCount / parseResult.records.length) * 100).toFixed(1);
        console.log(
          `✅ Batch ${batchNumber}/${totalBatches}: Inserted ${batch.length} records (${successCount}/${parseResult.records.length} - ${progress}%)`,
        );

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, (error as Error).message);
        failCount += batch.length;

        for (let j = 0; j < batch.length; j++) {
          const recordIndex = i + j;
          try {
            const singleData: Record<string, unknown> = {
              ...batch[j].structuredFields,
            };

            const jsonbColumn = parser.getJsonbColumn();
            if (Object.keys(batch[j].jsonbFields).length > 0) {
              singleData[jsonbColumn] = batch[j].jsonbFields;
            }

            const { error: singleError } = await supabase
              .from(options.targetTable)
              .insert([singleData])
              .select("id");

            if (!singleError) {
              successCount++;
              failCount--;
            } else {
              insertErrors.push({
                record: recordIndex + 1,
                error: singleError.message,
              });
            }
          } catch (e) {
            insertErrors.push({
              record: recordIndex + 1,
              error: (e as Error).message,
            });
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📈 IMPORT SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed to import: ${failCount} records`);
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(
      `🚀 Average speed: ${(successCount / parseFloat(duration)).toFixed(0)} records/second`,
    );

    if (insertErrors.length > 0) {
      console.log("\n⚠️  Insert Errors:");
      insertErrors.slice(0, 10).forEach((err) => {
        console.log(`  - Record ${err.record}: ${err.error}`);
      });
      if (insertErrors.length > 10) {
        console.log(`  ... and ${insertErrors.length - 10} more errors`);
      }
    }

    console.log("\n✨ Import process completed!");
  } catch (error) {
    console.error("\n❌ Fatal error during import:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: tsx scripts/import-historical.ts [options]

Options:
  --file <path>           Path to CSV file (required)
  --table <name>          Target table name (required)
  --batch-size <number>   Batch size for processing (default: 500)
  --dry-run               Parse and validate without inserting data
  --help, -h              Show this help message

Example:
  tsx scripts/import-historical.ts --file data/students.csv --table students
  tsx scripts/import-historical.ts --file data/students.csv --table students --dry-run
  tsx scripts/import-historical.ts --file data/students.csv --table students --batch-size 1000
`);
    process.exit(0);
  }

  const options: ImportOptions = {
    csvFilePath: "",
    targetTable: "",
    batchSize: 500,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file":
        options.csvFilePath = args[++i];
        break;
      case "--table":
        options.targetTable = args[++i];
        break;
      case "--batch-size":
        options.batchSize = parseInt(args[++i], 10);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
    }
  }

  if (!options.csvFilePath) {
    console.error("❌ Error: --file argument is required");
    process.exit(1);
  }

  if (!options.targetTable) {
    console.error("❌ Error: --table argument is required");
    process.exit(1);
  }

  await importHistoricalData(options);
}

main();
