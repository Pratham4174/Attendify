import type { Branch } from "../types";

export type ParsedEmployeeImportRow = {
  rowNumber: number;
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  branchLabel: string;
  branchId: string;
  monthlySalary: string;
  monthlyLeaveAllowance: string;
  advancePaid: string;
  error: string | null;
};

const EXPECTED_HEADERS = [
  "employeeCode",
  "name",
  "designation",
  "email",
  "phone",
  "branch",
  "monthlySalary",
  "monthlyLeaveAllowance",
  "advancePaid"
] as const;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeBranchLabel(value: string) {
  return value.trim().toLowerCase();
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];

    if (character === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\"";
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function splitLine(line: string, delimiter: "tab" | "csv") {
  return delimiter === "tab"
    ? line.split("\t").map((value) => value.trim())
    : splitCsvLine(line);
}

function resolveBranchId(branchLabel: string, branches: Branch[]) {
  if (!branchLabel.trim()) {
    return "";
  }

  const normalized = normalizeBranchLabel(branchLabel);
  return (
    branches.find(
      (branch) =>
        branch.id === branchLabel.trim() || normalizeBranchLabel(branch.name) === normalized
    )?.id ?? ""
  );
}

function isHeaderRow(values: string[]) {
  const normalizedHeaders = values.map(normalizeHeader);
  return normalizedHeaders.some((header) =>
    EXPECTED_HEADERS.map(normalizeHeader).includes(header as never)
  );
}

export function parseEmployeeImportText(raw: string, branches: Branch[]): ParsedEmployeeImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const delimiter: "tab" | "csv" = lines.some((line) => line.includes("\t")) ? "tab" : "csv";
  const firstRow = splitLine(lines[0], delimiter);
  const hasHeader = isHeaderRow(firstRow);

  let columnMap = EXPECTED_HEADERS.map((_, index) => index);
  let dataLines = lines;

  if (hasHeader) {
    const normalizedHeaders = firstRow.map(normalizeHeader);
    columnMap = EXPECTED_HEADERS.map((expected) => normalizedHeaders.indexOf(normalizeHeader(expected)));
    dataLines = lines.slice(1);
  }

  return dataLines.map((line, index) => {
    const values = splitLine(line, delimiter);
    const rowNumber = hasHeader ? index + 2 : index + 1;
    const row = {
      rowNumber,
      employeeCode: values[columnMap[0]]?.trim() ?? "",
      name: values[columnMap[1]]?.trim() ?? "",
      designation: values[columnMap[2]]?.trim() ?? "",
      email: values[columnMap[3]]?.trim() ?? "",
      phone: values[columnMap[4]]?.trim() ?? "",
      branchLabel: values[columnMap[5]]?.trim() ?? "",
      branchId: "",
      monthlySalary: values[columnMap[6]]?.trim() ?? "",
      monthlyLeaveAllowance: values[columnMap[7]]?.trim() ?? "0",
      advancePaid: values[columnMap[8]]?.trim() ?? "0",
      error: null as string | null
    };

    const missingFields = [
      row.employeeCode ? null : "employee code",
      row.name ? null : "name",
      row.designation ? null : "designation",
      row.email ? null : "email",
      row.phone ? null : "phone",
      row.branchLabel ? null : "branch",
      row.monthlySalary ? null : "monthly salary"
    ].filter(Boolean);

    row.branchId = resolveBranchId(row.branchLabel, branches);

    if (missingFields.length) {
      row.error = `Missing ${missingFields.join(", ")}.`;
    } else if (!row.branchId) {
      row.error = `Unknown branch "${row.branchLabel}". Use a branch name exactly as listed in ATTENDIFY.`;
    } else if (Number.isNaN(Number(row.monthlySalary)) || Number(row.monthlySalary) < 0) {
      row.error = "Monthly salary must be a valid non-negative number.";
    } else if (
      Number.isNaN(Number(row.monthlyLeaveAllowance)) ||
      Number(row.monthlyLeaveAllowance) < 0 ||
      Number(row.monthlyLeaveAllowance) > 31
    ) {
      row.error = "Allowed leaves must be between 0 and 31.";
    } else if (Number.isNaN(Number(row.advancePaid)) || Number(row.advancePaid) < 0) {
      row.error = "Advance paid must be a valid non-negative number.";
    }

    return row;
  });
}

export function downloadEmployeeImportTemplate() {
  const template = [
    "employeeCode,name,designation,email,phone,branch,monthlySalary,monthlyLeaveAllowance,advancePaid",
    "EMP-001,Rahul Sharma,Front Desk,rahul@property.com,+91-9876500000,Main Branch,22000,2,0"
  ].join("\n");
  const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "attendify-employee-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
