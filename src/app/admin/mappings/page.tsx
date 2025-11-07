"use client";

import { useState, useEffect } from "react";
import { VALID_TABLE_COLUMN_COMBINATIONS, VALID_TABLES } from "@/lib/constants/tableColumns";

/**
 * Field Mapping Configuration Admin UI
 *
 * NOTE: This client-side component calls /api/mappings and /api/transform endpoints
 * without the X-Internal-API-Key header. In production, these endpoints require the key.
 *
 * TODO (follow-up): Move admin operations to server-side (Server Actions or proxy endpoints)
 * and implement proper admin authentication. The internal API key should never reach the client.
 * See CodeRabbit review feedback for details.
 */

interface CompatibilityRule {
  description?: string;
  rename?: Record<string, string>;
  valueMap?: Record<string, Record<string, unknown>>;
  defaults?: Record<string, unknown>;
  drop?: string[];
}

export default function MappingsAdmin() {
  const [mappings, setMappings] = useState<Record<string, Record<string, CompatibilityRule[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("students");
  const [selectedColumn, setSelectedColumn] = useState<string>("extra_fields");
  const [newRuleDescription, setNewRuleDescription] = useState("");
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [previewData, setPreviewData] = useState("");
  const [previewResult, setPreviewResult] = useState<{
    original: Record<string, unknown>;
    transformed: Record<string, unknown>;
    appliedRules: string[];
  } | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mappings");
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError(
            "Authentication required. This admin page only works in development. " +
            "Production requires server-side proxy with admin authentication. " +
            "See TODO comment in code for details."
          );
          return;
        }
        const data = await response.json();
        setError(data.error || `Failed to fetch mappings (${response.status})`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setMappings(data.mappings || {});
      } else {
        setError(data.error || "Failed to fetch mappings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mappings");
    } finally {
      setLoading(false);
    }
  };

  const addMapping = async () => {
    if (!newRuleDescription || !renameFrom || !renameTo) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const rule: CompatibilityRule = {
        description: newRuleDescription,
        rename: {
          [renameFrom]: renameTo,
        },
      };

      const response = await fetch("/api/mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: selectedTable,
          column: selectedColumn,
          rules: [rule],
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert(
            "Authentication required. This admin page only works in development. " +
            "Production requires server-side proxy with admin authentication."
          );
          return;
        }
      }

      const data = await response.json();

      if (data.success) {
        setNewRuleDescription("");
        setRenameFrom("");
        setRenameTo("");
        await fetchMappings();
        alert("Mapping added successfully!");
      } else {
        alert(data.error || "Failed to add mapping");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add mapping");
    }
  };

  const previewTransformation = async () => {
    if (!previewData) {
      alert("Please enter preview data");
      return;
    }

    try {
      const data = JSON.parse(previewData);

      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: selectedTable,
          column: selectedColumn,
          data,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert(
            "Authentication required. This admin page only works in development. " +
            "Production requires server-side proxy with admin authentication."
          );
          return;
        }
      }

      const result = await response.json();

      if (result.success) {
        setPreviewResult({
          original: result.original,
          transformed: result.transformedData,
          appliedRules: result.appliedRules,
        });
      } else {
        alert(result.error || "Failed to preview transformation");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Invalid JSON or transformation failed");
    }
  };

  const currentMappings = mappings[selectedTable]?.[selectedColumn] || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Field Mapping Configuration</h1>

        {loading && <div className="text-center py-8">Loading mappings...</div>}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Add New Mapping Rule</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Table</label>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setSelectedColumn(VALID_TABLE_COLUMN_COMBINATIONS[e.target.value][0]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {VALID_TABLES.map((table) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Column</label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {VALID_TABLE_COLUMN_COMBINATIONS[selectedTable].map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Description
                </label>
                <input
                  type="text"
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  placeholder="e.g., Rename legacy field names"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rename From (old field name)
                </label>
                <input
                  type="text"
                  value={renameFrom}
                  onChange={(e) => setRenameFrom(e.target.value)}
                  placeholder="e.g., oldFieldName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rename To (new field name)
                </label>
                <input
                  type="text"
                  value={renameTo}
                  onChange={(e) => setRenameTo(e.target.value)}
                  placeholder="e.g., new_field_name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={addMapping}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Mapping Rule
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Current Mappings for {selectedTable}.{selectedColumn}
            </h2>

            {currentMappings.length === 0 ? (
              <p className="text-gray-500">
                No mappings configured for this table.column combination.
              </p>
            ) : (
              <div className="space-y-4">
                {currentMappings.map((rule, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    {rule.description && (
                      <p className="font-medium text-gray-900 mb-2">{rule.description}</p>
                    )}
                    {rule.rename && (
                      <div className="text-sm text-gray-600">
                        <strong>Rename:</strong>
                        <ul className="ml-4 mt-1">
                          {Object.entries(rule.rename).map(([from, to]) => (
                            <li key={from}>
                              {from} → {to}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rule.valueMap && (
                      <div className="text-sm text-gray-600 mt-2">
                        <strong>Value Map:</strong>
                        <pre className="ml-4 mt-1 text-xs">
                          {JSON.stringify(rule.valueMap, null, 2)}
                        </pre>
                      </div>
                    )}
                    {rule.defaults && (
                      <div className="text-sm text-gray-600 mt-2">
                        <strong>Defaults:</strong>
                        <pre className="ml-4 mt-1 text-xs">
                          {JSON.stringify(rule.defaults, null, 2)}
                        </pre>
                      </div>
                    )}
                    {rule.drop && (
                      <div className="text-sm text-gray-600 mt-2">
                        <strong>Drop:</strong> {rule.drop.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Preview Transformation</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Data (JSON)
              </label>
              <textarea
                value={previewData}
                onChange={(e) => setPreviewData(e.target.value)}
                placeholder='{"oldFieldName": "value", "anotherField": "data"}'
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <button
              onClick={previewTransformation}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Preview Transformation
            </button>

            {previewResult && (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Original Data:</h3>
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(previewResult.original, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Transformed Data:</h3>
                  <pre className="bg-green-50 p-4 rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(previewResult.transformed, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Applied Rules:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {previewResult.appliedRules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
