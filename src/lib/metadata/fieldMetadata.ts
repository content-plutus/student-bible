import {
  ZodArray,
  ZodDefault,
  ZodEnum,
  ZodFirstPartyTypeKind,
  ZodLiteral,
  ZodNativeEnum,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodTypeAny,
} from "zod";
import { jsonbSchemaRegistry } from "@/lib/jsonb/schemaRegistry";
import { VALID_TABLE_COLUMN_COMBINATIONS } from "@/lib/constants/tableColumns";

export type FieldSource = "core" | "jsonb";

export interface FieldMetadata {
  name: string;
  label?: string;
  description?: string;
  dataType: string;
  arrayItemType?: string;
  enumValues?: string[];
  optional: boolean;
  nullable: boolean;
  source: FieldSource;
  path: string;
  tags?: string[];
}

export interface JsonbColumnMetadata {
  column: string;
  version?: number;
  description?: string;
  allowUnknownKeys?: boolean;
  fields: FieldMetadata[];
}

export interface TableFieldMetadata {
  name: string;
  description?: string;
  category?: string;
  coreFields: FieldMetadata[];
  jsonbColumns: JsonbColumnMetadata[];
  fieldCount: number;
}

export interface FieldMetadataQuery {
  table?: string;
  column?: string;
  includeCore?: boolean;
}

export interface FieldMetadataResult {
  generatedAt: string;
  tables: TableFieldMetadata[];
  summary: {
    tables: number;
    columns: number;
    fields: number;
  };
}

type ZodDefLike = {
  typeName?: string;
  type?: string;
  innerType?: ZodTypeAny;
  out?: ZodTypeAny;
  in?: ZodTypeAny;
  schema?: ZodTypeAny;
  getter?: () => ZodTypeAny;
  values?: unknown;
  value?: unknown;
};

const CORE_TABLE_FIELDS: Record<string, FieldMetadata[]> = {
  students: [
    makeCoreField("students", "id", "Student ID", "uuid", {
      tags: ["identifier"],
      description: "Primary identifier.",
    }),
    makeCoreField("students", "phone_number", "Phone Number", "string", {
      description: "Primary contact number (10 digits).",
      tags: ["contact", "required"],
    }),
    makeCoreField("students", "email", "Email", "string", {
      description: "Student email stored as citext.",
      tags: ["contact", "required"],
    }),
    makeCoreField("students", "first_name", "First Name", "string", { tags: ["profile"] }),
    makeCoreField("students", "last_name", "Last Name", "string", {
      optional: true,
      tags: ["profile"],
    }),
    makeCoreField("students", "created_at", "Created At", "timestamp", {
      description: "Record creation timestamp.",
      tags: ["system"],
    }),
  ],
  student_addresses: [
    makeCoreField("student_addresses", "student_id", "Student ID", "uuid", {
      description: "FK to students table.",
      tags: ["relationship"],
    }),
    makeCoreField("student_addresses", "address_line1", "Address Line 1", "string", {
      tags: ["address", "required"],
    }),
    makeCoreField("student_addresses", "city", "City", "string", {
      tags: ["address", "required"],
    }),
    makeCoreField("student_addresses", "postal_code", "Postal Code", "string", {
      tags: ["address", "required"],
    }),
  ],
  student_certifications: [
    makeCoreField("student_certifications", "student_id", "Student ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("student_certifications", "certification_id", "Certification ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("student_certifications", "status", "Status", "string", {
      tags: ["status"],
    }),
  ],
  exam_attempts: [
    makeCoreField("exam_attempts", "student_id", "Student ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("exam_attempts", "attempt_number", "Attempt #", "number", {
      tags: ["progress"],
    }),
    makeCoreField("exam_attempts", "score", "Score", "number", {
      optional: true,
      nullable: true,
      tags: ["score"],
    }),
  ],
  form_submissions: [
    makeCoreField("form_submissions", "id", "Submission ID", "uuid", {
      tags: ["identifier"],
    }),
    makeCoreField("form_submissions", "student_id", "Student ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("form_submissions", "submitted_at", "Submitted At", "timestamp", {
      tags: ["system"],
    }),
  ],
  attendance_records: [
    makeCoreField("attendance_records", "student_id", "Student ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("attendance_records", "session_date", "Session Date", "date", {
      tags: ["schedule"],
    }),
    makeCoreField("attendance_records", "status", "Status", "string", {
      tags: ["status"],
    }),
  ],
  test_scores: [
    makeCoreField("test_scores", "student_id", "Student ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("test_scores", "assessment_name", "Assessment Name", "string", {
      tags: ["assessment"],
    }),
    makeCoreField("test_scores", "score", "Score", "number", {
      nullable: true,
      optional: true,
      tags: ["score"],
    }),
  ],
  academic_info: [
    makeCoreField("academic_info", "student_id", "Student ID", "uuid", {
      tags: ["relationship"],
    }),
    makeCoreField("academic_info", "education_level", "Education Level", "string", {
      tags: ["profile"],
    }),
    makeCoreField("academic_info", "institution", "Institution", "string", {
      optional: true,
      tags: ["profile"],
    }),
  ],
};

function makeCoreField(
  table: string,
  name: string,
  label: string,
  dataType: string,
  overrides?: Partial<FieldMetadata>,
): FieldMetadata {
  return {
    name,
    label,
    description: overrides?.description,
    dataType,
    optional: overrides?.optional ?? false,
    nullable: overrides?.nullable ?? false,
    source: "core",
    path: `${table}.${name}`,
    tags: overrides?.tags,
  };
}

export function getFieldMetadata(query: FieldMetadataQuery = {}): FieldMetadataResult {
  const registryEntries = jsonbSchemaRegistry.list();
  const requestedTable = query.table?.toLowerCase();
  const requestedColumn = query.column?.toLowerCase();

  const tables = collectTableNames(registryEntries);

  const tableMetadata: TableFieldMetadata[] = [];

  for (const tableName of tables) {
    if (requestedTable && tableName !== requestedTable) {
      continue;
    }

    const coreFields = query.includeCore === false ? [] : (CORE_TABLE_FIELDS[tableName] ?? []);

    const jsonbColumns = registryEntries
      .filter((definition) => definition.table === tableName)
      .filter((definition) => {
        if (!requestedColumn) return true;
        return definition.column.toLowerCase() === requestedColumn;
      })
      .map((definition) => ({
        column: definition.column,
        version: definition.version,
        description: definition.description,
        allowUnknownKeys: definition.allowUnknownKeys,
        fields: extractFieldsFromSchema(tableName, definition.column, definition.schema),
      }));

    if (requestedColumn && jsonbColumns.length === 0) {
      continue;
    }

    if (coreFields.length === 0 && jsonbColumns.length === 0) {
      continue;
    }

    const fieldCount =
      coreFields.length + jsonbColumns.reduce((acc, column) => acc + column.fields.length, 0);

    tableMetadata.push({
      name: tableName,
      coreFields,
      jsonbColumns,
      fieldCount,
    });
  }

  const summary = {
    tables: tableMetadata.length,
    columns: tableMetadata.reduce((acc, table) => acc + table.jsonbColumns.length, 0),
    fields: tableMetadata.reduce((acc, table) => acc + table.fieldCount, 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    tables: tableMetadata,
    summary,
  };
}

function collectTableNames(definitions: ReturnType<typeof jsonbSchemaRegistry.list>) {
  const tableSet = new Set<string>();

  Object.keys(CORE_TABLE_FIELDS).forEach((table) => tableSet.add(table));
  Object.keys(VALID_TABLE_COLUMN_COMBINATIONS).forEach((table) => tableSet.add(table));
  definitions.forEach((definition) => tableSet.add(definition.table));

  return Array.from(tableSet).sort();
}

function extractFieldsFromSchema(
  table: string,
  column: string,
  schema: ZodTypeAny,
): FieldMetadata[] {
  if (!(schema instanceof ZodObject)) {
    return [];
  }

  const rawShape = typeof schema.shape === "function" ? schema.shape() : schema.shape;
  const shapeEntries = Object.entries(rawShape ?? {});

  return shapeEntries.map(([fieldName, fieldSchema]) => {
    if (!fieldSchema) {
      return {
        name: fieldName,
        dataType: "unknown",
        optional: true,
        nullable: true,
        source: "jsonb",
        path: `${table}.${column}.${fieldName}`,
      } as FieldMetadata;
    }

    let description: DescribedType;
    try {
      description = describeZodType(fieldSchema);
    } catch {
      description = basicDescription("unknown", { optional: true, nullable: true });
    }
    return {
      name: fieldName,
      dataType: description.dataType,
      arrayItemType: description.arrayItemType,
      enumValues: description.enumValues,
      optional: description.optional,
      nullable: description.nullable,
      source: "jsonb",
      path: `${table}.${column}.${fieldName}`,
    };
  });
}

interface DescribedType {
  dataType: string;
  arrayItemType?: string;
  enumValues?: string[];
  optional: boolean;
  nullable: boolean;
}

function describeZodType(type: ZodTypeAny): DescribedType {
  if (!type || typeof type !== "object") {
    return basicDescription("unknown", { optional: true, nullable: true });
  }
  const unwrapped = unwrapType(type);
  const baseType = unwrapped.type;
  if (!baseType || typeof baseType !== "object") {
    return basicDescription("unknown", {
      optional: unwrapped.optional,
      nullable: unwrapped.nullable,
    });
  }
  const baseTypeDef = getZodDef(baseType) as ZodDefLike | undefined;
  const baseTypeName = baseTypeDef?.typeName ?? baseTypeDef?.type;

  if (baseType instanceof ZodArray) {
    const elementDescription = describeZodType(baseType.element);
    return {
      dataType: "array",
      arrayItemType: elementDescription.dataType,
      enumValues: elementDescription.enumValues,
      optional: unwrapped.optional,
      nullable: unwrapped.nullable,
    };
  }

  if (baseType instanceof ZodEnum) {
    const def = getZodDef(baseType) as ZodDefLike | undefined;
    return {
      dataType: "enum",
      enumValues: Array.isArray(def?.values) ? [...def.values] : undefined,
      optional: unwrapped.optional,
      nullable: unwrapped.nullable,
    };
  }

  if (baseType instanceof ZodNativeEnum) {
    const def = getZodDef(baseType) as ZodDefLike | undefined;
    return {
      dataType: "enum",
      enumValues: def?.values ? Object.values(def.values).map((value) => String(value)) : undefined,
      optional: unwrapped.optional,
      nullable: unwrapped.nullable,
    };
  }

  if (baseType instanceof ZodLiteral) {
    const def = getZodDef(baseType) as ZodDefLike | undefined;
    return {
      dataType: typeof def?.value,
      enumValues: def?.value !== undefined ? [String(def.value)] : undefined,
      optional: unwrapped.optional,
      nullable: unwrapped.nullable,
    };
  }

  switch (baseTypeName) {
    case ZodFirstPartyTypeKind.ZodString:
    case "ZodString":
    case "string":
      return basicDescription("string", unwrapped);
    case ZodFirstPartyTypeKind.ZodNumber:
    case "ZodNumber":
    case "number":
      return basicDescription("number", unwrapped);
    case ZodFirstPartyTypeKind.ZodBoolean:
    case "ZodBoolean":
    case "boolean":
      return basicDescription("boolean", unwrapped);
    case ZodFirstPartyTypeKind.ZodDate:
    case "ZodDate":
    case "date":
      return basicDescription("date", unwrapped);
    case ZodFirstPartyTypeKind.ZodBigInt:
    case "ZodBigInt":
    case "bigint":
      return basicDescription("bigint", unwrapped);
    case ZodFirstPartyTypeKind.ZodObject:
    case "ZodObject":
    case "object":
      return basicDescription("object", unwrapped);
    case ZodFirstPartyTypeKind.ZodAny:
    case ZodFirstPartyTypeKind.ZodUnknown:
    case "ZodAny":
    case "ZodUnknown":
    case "any":
    case "unknown":
      return basicDescription("unknown", unwrapped);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
    case "ZodUnion":
    case "ZodDiscriminatedUnion":
    case "union":
      return basicDescription("union", unwrapped);
    case ZodFirstPartyTypeKind.ZodNull:
    case "ZodNull":
    case "null":
      return basicDescription("null", unwrapped);
    case ZodFirstPartyTypeKind.ZodPromise:
    case "ZodPromise":
    case "promise":
      return basicDescription("promise", unwrapped);
    default:
      return basicDescription("unknown", unwrapped);
  }
}

function basicDescription(
  type: string,
  metadata: { optional: boolean; nullable: boolean },
): DescribedType {
  return {
    dataType: type,
    optional: metadata.optional,
    nullable: metadata.nullable,
  };
}

function unwrapType(zodType: ZodTypeAny) {
  if (!zodType || typeof zodType !== "object") {
    return {
      type: zodType,
      optional: true,
      nullable: true,
    };
  }
  let current: ZodTypeAny = zodType;
  let optional = false;
  let nullable = false;

  while (true) {
    if (!current || typeof current !== "object") {
      break;
    }
    const def = getZodDef(current) as ZodDefLike | undefined;
    if (!def) {
      break;
    }
    const typeName = def.typeName ?? def.type;
    if (current instanceof ZodOptional) {
      optional = true;
      current = current.unwrap();
      continue;
    }

    if (current instanceof ZodNullable) {
      nullable = true;
      current = current.unwrap();
      continue;
    }

    if (current instanceof ZodDefault) {
      current = def.innerType;
      continue;
    }

    if (typeName === ZodFirstPartyTypeKind.ZodReadonly || typeName === "readonly") {
      current = def.innerType;
      continue;
    }

    if (
      typeName === ZodFirstPartyTypeKind.ZodPipeline ||
      typeName === "ZodPipeline" ||
      typeName === "pipe"
    ) {
      current = def.out ?? def.in;
      if (!current) {
        break;
      }
      continue;
    }

    if (typeName === ZodFirstPartyTypeKind.ZodBranded || typeName === "ZodBranded") {
      current = def.type;
      continue;
    }

    if (typeName === ZodFirstPartyTypeKind.ZodEffects || typeName === "ZodEffects") {
      current = def.schema;
      continue;
    }

    if (typeName === ZodFirstPartyTypeKind.ZodLazy || typeName === "lazy") {
      current = def.getter?.();
      continue;
    }

    break;
  }

  return { type: current, optional, nullable };
}

function getZodDef(type: unknown): Record<string, unknown> | undefined {
  if (!type || typeof type !== "object") {
    return undefined;
  }

  const carrier = type as Record<string, unknown>;

  if ("_def" in carrier && carrier._def && typeof carrier._def === "object") {
    return carrier._def as Record<string, unknown>;
  }

  if ("def" in carrier && carrier.def && typeof carrier.def === "object") {
    return carrier.def as Record<string, unknown>;
  }

  return undefined;
}
