/**
 * 覆盖率检查脚本 / Coverage Check Script
 *
 * 功能 / Features:
 * 1. 读取 coverage.yaml 配置文件 / Read coverage.yaml config file
 * 2. 计算全量代码和各目录的覆盖率 / Calculate full and directory-level coverage
 * 3. 根据配置文件检查覆盖率是否达标 / Check if coverage meets thresholds
 * 4. 输出详细的覆盖率报告 / Output detailed coverage report
 *
 * 使用方式 / Usage:
 *   npx tsx scripts/check-coverage.ts
 *   npx tsx scripts/check-coverage.ts --no-check  # 只显示报告，不检查阈值
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

// ES module 兼容：获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 类型定义 / Type Definitions
// ============================================================================

interface CoverageThreshold {
  branch_coverage: number;
  line_coverage: number;
}

interface DirectoryOverride {
  full?: Partial<CoverageThreshold>;
  incremental?: Partial<CoverageThreshold>;
}

interface CoverageConfig {
  full: CoverageThreshold;
  incremental: CoverageThreshold;
  directory_overrides: Record<string, DirectoryOverride>;
  exclude_directories: string[];
  exclude_patterns: string[];
}

interface CoverageResult {
  totalStatements: number;
  coveredStatements: number;
  totalBranches: number;
  coveredBranches: number;
  lineCoverage: number;
  branchCoverage: number;
}

interface FileCoverageData {
  path: string;
  statementMap: Record<string, { start: { line: number }; end: { line: number } }>;
  fnMap: Record<string, unknown>;
  branchMap: Record<string, { locations: unknown[] }>;
  s: Record<string, number>; // statement coverage: key -> hit count
  f: Record<string, number>; // function coverage: key -> hit count
  b: Record<string, number[]>; // branch coverage: key -> [branch1 hits, branch2 hits, ...]
}

type CoverageFinalJson = Record<string, FileCoverageData>;

// ============================================================================
// 默认配置 / Default Configuration
// ============================================================================

const DEFAULT_THRESHOLD: CoverageThreshold = {
  branch_coverage: 95,
  line_coverage: 95,
};

// ============================================================================
// 配置加载 / Configuration Loading
// ============================================================================

function loadConfig(configPath: string): CoverageConfig {
  const defaultConfig: CoverageConfig = {
    full: { ...DEFAULT_THRESHOLD },
    incremental: { ...DEFAULT_THRESHOLD },
    directory_overrides: {},
    exclude_directories: [],
    exclude_patterns: [],
  };

  if (!fs.existsSync(configPath)) {
    console.log(`⚠️  配置文件 ${configPath} 不存在，使用默认配置`);
    return defaultConfig;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const data = yaml.load(content) as Partial<CoverageConfig> | null;

    if (!data) {
      return defaultConfig;
    }

    const full: CoverageThreshold = {
      branch_coverage: data.full?.branch_coverage ?? DEFAULT_THRESHOLD.branch_coverage,
      line_coverage: data.full?.line_coverage ?? DEFAULT_THRESHOLD.line_coverage,
    };

    const incremental: CoverageThreshold = {
      branch_coverage: data.incremental?.branch_coverage ?? full.branch_coverage,
      line_coverage: data.incremental?.line_coverage ?? full.line_coverage,
    };

    const directoryOverrides: Record<string, DirectoryOverride> = {};
    if (data.directory_overrides) {
      for (const [dir, override] of Object.entries(data.directory_overrides)) {
        directoryOverrides[dir] = {
          full: override?.full
            ? {
                branch_coverage: override.full.branch_coverage ?? full.branch_coverage,
                line_coverage: override.full.line_coverage ?? full.line_coverage,
              }
            : undefined,
          incremental: override?.incremental
            ? {
                branch_coverage:
                  override.incremental.branch_coverage ?? incremental.branch_coverage,
                line_coverage: override.incremental.line_coverage ?? incremental.line_coverage,
              }
            : undefined,
        };
      }
    }

    return {
      full,
      incremental,
      directory_overrides: directoryOverrides,
      exclude_directories: data.exclude_directories ?? [],
      exclude_patterns: data.exclude_patterns ?? [],
    };
  } catch (error) {
    console.error(`❌ 读取配置文件失败: ${error}`);
    return defaultConfig;
  }
}

function getThresholdForDirectory(
  config: CoverageConfig,
  directory: string,
  isIncremental = false
): CoverageThreshold {
  const defaultThreshold = isIncremental ? config.incremental : config.full;

  if (config.directory_overrides[directory]) {
    const override = isIncremental
      ? config.directory_overrides[directory].incremental
      : config.directory_overrides[directory].full;

    if (override) {
      return {
        branch_coverage: override.branch_coverage ?? defaultThreshold.branch_coverage,
        line_coverage: override.line_coverage ?? defaultThreshold.line_coverage,
      };
    }
  }

  return defaultThreshold;
}

// ============================================================================
// 覆盖率计算 / Coverage Calculation
// ============================================================================

function loadCoverageData(coveragePath: string): CoverageFinalJson | null {
  if (!fs.existsSync(coveragePath)) {
    console.error(`❌ 覆盖率报告 ${coveragePath} 不存在`);
    console.error('请先运行 `npm run test:coverage` 生成覆盖率报告');
    return null;
  }

  try {
    const content = fs.readFileSync(coveragePath, 'utf-8');
    return JSON.parse(content) as CoverageFinalJson;
  } catch (error) {
    console.error(`❌ 读取覆盖率报告失败: ${error}`);
    return null;
  }
}

function calculateFileCoverage(fileData: FileCoverageData): CoverageResult {
  // 计算语句覆盖率 / Calculate statement coverage
  const statements = Object.values(fileData.s);
  const totalStatements = statements.length;
  const coveredStatements = statements.filter(hits => hits > 0).length;

  // 计算分支覆盖率 / Calculate branch coverage
  // 每个 branchMap 条目可能有多个分支（如 if/else 有两个分支）
  let totalBranches = 0;
  let coveredBranches = 0;

  for (const branchHits of Object.values(fileData.b)) {
    for (const hits of branchHits) {
      totalBranches++;
      if (hits > 0) {
        coveredBranches++;
      }
    }
  }

  return {
    totalStatements,
    coveredStatements,
    totalBranches,
    coveredBranches,
    lineCoverage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100,
    branchCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
  };
}

function calculateCoverage(
  coverageData: CoverageFinalJson,
  fileFilter?: (filePath: string) => boolean
): CoverageResult {
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  for (const [filePath, fileData] of Object.entries(coverageData)) {
    // 应用文件过滤 / Apply file filter
    if (fileFilter && !fileFilter(filePath)) {
      continue;
    }

    const fileCoverage = calculateFileCoverage(fileData);
    totalStatements += fileCoverage.totalStatements;
    coveredStatements += fileCoverage.coveredStatements;
    totalBranches += fileCoverage.totalBranches;
    coveredBranches += fileCoverage.coveredBranches;
  }

  return {
    totalStatements,
    coveredStatements,
    totalBranches,
    coveredBranches,
    lineCoverage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100,
    branchCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
  };
}

function calculateDirectoryCoverage(
  coverageData: CoverageFinalJson,
  directory: string,
  projectRoot: string
): CoverageResult {
  // 将目录转换为绝对路径用于匹配
  const dirAbsPath = path.join(projectRoot, directory);

  return calculateCoverage(coverageData, filePath => filePath.startsWith(dirAbsPath));
}

function discoverDirectories(coverageData: CoverageFinalJson, projectRoot: string): string[] {
  const directories = new Set<string>();

  for (const filePath of Object.keys(coverageData)) {
    // 获取相对于项目根目录的路径
    const relativePath = path.relative(projectRoot, filePath);
    const parts = relativePath.split(path.sep);

    // 只取前两级目录 (如 src/agent-runtime)
    if (parts.length >= 2) {
      directories.add(parts.slice(0, 2).join('/'));
    }
  }

  return Array.from(directories).sort();
}

// ============================================================================
// 报告输出 / Report Output
// ============================================================================

function printCoverageReport(
  fullCoverage: CoverageResult,
  directoryCoverages: Map<string, CoverageResult>
): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 覆盖率报告 / Coverage Report');
  console.log('='.repeat(70));

  console.log('\n📈 全量代码覆盖率 / Full Coverage:');
  console.log(`   行覆盖率 / Line Coverage:     ${fullCoverage.lineCoverage.toFixed(2)}%`);
  console.log(
    `                                 (${fullCoverage.coveredStatements}/${fullCoverage.totalStatements} 语句)`
  );
  console.log(`   分支覆盖率 / Branch Coverage: ${fullCoverage.branchCoverage.toFixed(2)}%`);
  console.log(
    `                                 (${fullCoverage.coveredBranches}/${fullCoverage.totalBranches} 分支)`
  );

  if (directoryCoverages.size > 0) {
    console.log('\n📁 目录覆盖率 / Directory Coverage:');
    console.log('-'.repeat(70));
    console.log(
      `${'目录 / Directory'.padEnd(35)} | ${'行覆盖率'.padStart(10)} | ${'分支覆盖率'.padStart(10)}`
    );
    console.log('-'.repeat(70));

    for (const [directory, coverage] of directoryCoverages) {
      const lineStr = `${coverage.lineCoverage.toFixed(1)}%`.padStart(10);
      const branchStr = `${coverage.branchCoverage.toFixed(1)}%`.padStart(10);
      console.log(`${directory.padEnd(35)} | ${lineStr} | ${branchStr}`);
    }
    console.log('-'.repeat(70));
  }

  console.log('\n' + '='.repeat(70));
}

// ============================================================================
// 阈值检查 / Threshold Checking
// ============================================================================

interface CheckResult {
  passed: boolean;
  failures: string[];
}

function checkCoverageThresholds(
  config: CoverageConfig,
  fullCoverage: CoverageResult,
  directoryCoverages: Map<string, CoverageResult>
): CheckResult {
  const failures: string[] = [];

  console.log('\n🔍 覆盖率检查 / Coverage Check:');

  // 检查全量覆盖率 / Check full coverage
  const fullThreshold = config.full;

  if (fullCoverage.branchCoverage < fullThreshold.branch_coverage) {
    const msg = `全量分支覆盖率 ${fullCoverage.branchCoverage.toFixed(2)}% < ${fullThreshold.branch_coverage}%`;
    console.log(`   ❌ ${msg}`);
    failures.push(msg);
  } else {
    console.log(
      `   ✅ 全量分支覆盖率 ${fullCoverage.branchCoverage.toFixed(2)}% >= ${fullThreshold.branch_coverage}%`
    );
  }

  if (fullCoverage.lineCoverage < fullThreshold.line_coverage) {
    const msg = `全量行覆盖率 ${fullCoverage.lineCoverage.toFixed(2)}% < ${fullThreshold.line_coverage}%`;
    console.log(`   ❌ ${msg}`);
    failures.push(msg);
  } else {
    console.log(
      `   ✅ 全量行覆盖率 ${fullCoverage.lineCoverage.toFixed(2)}% >= ${fullThreshold.line_coverage}%`
    );
  }

  // 检查目录覆盖率 / Check directory coverage
  for (const [directory, coverage] of directoryCoverages) {
    const dirThreshold = getThresholdForDirectory(config, directory, false);

    if (coverage.branchCoverage < dirThreshold.branch_coverage) {
      const msg = `${directory} 分支覆盖率 ${coverage.branchCoverage.toFixed(2)}% < ${dirThreshold.branch_coverage}%`;
      console.log(`   ❌ ${msg}`);
      failures.push(msg);
    } else {
      console.log(
        `   ✅ ${directory} 分支覆盖率 ${coverage.branchCoverage.toFixed(2)}% >= ${dirThreshold.branch_coverage}%`
      );
    }

    if (coverage.lineCoverage < dirThreshold.line_coverage) {
      const msg = `${directory} 行覆盖率 ${coverage.lineCoverage.toFixed(2)}% < ${dirThreshold.line_coverage}%`;
      console.log(`   ❌ ${msg}`);
      failures.push(msg);
    } else {
      console.log(
        `   ✅ ${directory} 行覆盖率 ${coverage.lineCoverage.toFixed(2)}% >= ${dirThreshold.line_coverage}%`
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// ============================================================================
// 主函数 / Main Function
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const noCheck = args.includes('--no-check');
  const jsonOnly = args.includes('--json-only');

  // 项目根目录
  const projectRoot = path.resolve(__dirname, '..');
  const configPath = path.join(projectRoot, 'coverage.yaml');
  const coveragePath = path.join(projectRoot, 'coverage', 'coverage-final.json');

  // 加载配置
  const config = loadConfig(configPath);

  // 加载覆盖率数据
  const coverageData = loadCoverageData(coveragePath);
  if (!coverageData) {
    process.exit(1);
  }

  // 计算全量覆盖率
  const fullCoverage = calculateCoverage(coverageData);

  // 发现并计算各目录的覆盖率
  const discoveredDirs = discoverDirectories(coverageData, projectRoot);
  const configuredDirs = Object.keys(config.directory_overrides);
  const allDirs = [...new Set([...discoveredDirs, ...configuredDirs])].sort();

  const directoryCoverages = new Map<string, CoverageResult>();
  for (const dir of allDirs) {
    const coverage = calculateDirectoryCoverage(coverageData, dir, projectRoot);
    // 只添加有数据的目录
    if (coverage.totalStatements > 0 || coverage.totalBranches > 0) {
      directoryCoverages.set(dir, coverage);
    }
  }

  // 输出报告
  if (jsonOnly) {
    const result: Record<string, unknown> = {
      full_coverage: {
        line_coverage: fullCoverage.lineCoverage,
        branch_coverage: fullCoverage.branchCoverage,
        total_statements: fullCoverage.totalStatements,
        covered_statements: fullCoverage.coveredStatements,
        total_branches: fullCoverage.totalBranches,
        covered_branches: fullCoverage.coveredBranches,
      },
      directory_coverages: Object.fromEntries(
        Array.from(directoryCoverages.entries()).map(([dir, cov]) => [
          dir,
          {
            line_coverage: cov.lineCoverage,
            branch_coverage: cov.branchCoverage,
          },
        ])
      ),
    };
    console.log(JSON.stringify(result, null, 2));
  } else {
    printCoverageReport(fullCoverage, directoryCoverages);
  }

  // 检查阈值
  if (!noCheck && !jsonOnly) {
    const checkResult = checkCoverageThresholds(config, fullCoverage, directoryCoverages);

    if (!checkResult.passed) {
      console.log('\n❌ 覆盖率检查未通过 / Coverage check failed');
      if (checkResult.failures.length > 0) {
        console.log('\n未通过项 / Failures:');
        for (const failure of checkResult.failures) {
          console.log(`  - ${failure}`);
        }
      }
      process.exit(1);
    } else {
      console.log('\n✅ 覆盖率检查通过 / Coverage check passed!');
    }
  }
}

main();
