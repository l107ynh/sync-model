/**
 * cdk8s 設定檔解析主入口
 *
 * 接收本地 cdk8s repo 路徑，掃描並解析：
 * 1. GPU 設定檔（per edition）
 * 2. Model 元件定義
 * 3. 環境設定檔（cfg）
 */

import { Project, Node } from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import {
  resolveGpuKeyConstants,
  resolveModelTypeConstants,
  parseGpuEditions,
} from "./gpu-parser";
import { parseModelComponents } from "./model-parser";
import type {
  Cdk8sParseResult,
  ParsedEnvironment,
} from "./types";

export type { Cdk8sParseResult } from "./types";

/**
 * 解析 cdk8s repo，回傳結構化資料。
 *
 * @param repoPath cdk8s repo 的本地絕對路徑
 */
export async function parseCdk8sRepo(
  repoPath: string
): Promise<Cdk8sParseResult> {
  const warnings: string[] = [];

  // 驗證路徑
  const infernoDir = path.join(repoPath, "src/components/inferno");
  const gpuDir = path.join(infernoDir, "gpu");
  const cfgsDir = path.join(repoPath, "src/cfgs");
  const modelTypeFile = path.join(
    repoPath,
    "src/external/model_core/ts/src/model_type.ts"
  );
  const gpuKeyFile = path.join(gpuDir, "@common.gpu.key.ts");

  for (const dir of [infernoDir, gpuDir, cfgsDir]) {
    if (!fs.existsSync(dir)) {
      throw new Error(`目錄不存在: ${dir}`);
    }
  }
  if (!fs.existsSync(modelTypeFile)) {
    throw new Error(`ModelType 定義檔不存在: ${modelTypeFile}`);
  }

  // 建立 ts-morph Project（不需要 tsconfig，只做 AST 解析）
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      noEmit: true,
    },
    skipAddingFilesFromTsConfig: true,
  });

  // 加入需要解析的檔案
  project.addSourceFilesAtPaths([
    path.join(gpuDir, "*.ts"),
    path.join(infernoDir, "*.ts"),
    path.join(cfgsDir, "*.ts"),
    modelTypeFile,
  ]);

  // 1. 解析常數
  const modelTypeSrc = project.getSourceFile(modelTypeFile);
  if (!modelTypeSrc) {
    throw new Error(`無法讀取 ModelType 定義檔: ${modelTypeFile}`);
  }
  const modelTypeConstants = resolveModelTypeConstants(modelTypeSrc);

  const gpuKeySrc = project.getSourceFile(gpuKeyFile);
  if (!gpuKeySrc) {
    throw new Error(`無法讀取 GPU key 定義檔: ${gpuKeyFile}`);
  }
  const gpuKeyConstants = resolveGpuKeyConstants(gpuKeySrc);

  // 2. 解析 GPU editions
  const gpuResult = parseGpuEditions(
    project,
    gpuDir,
    modelTypeConstants,
    gpuKeyConstants
  );
  warnings.push(...gpuResult.warnings);

  // 3. 解析 model components
  const modelResult = parseModelComponents(
    project,
    infernoDir,
    modelTypeConstants,
    gpuKeyConstants
  );
  warnings.push(...modelResult.warnings);

  // 4. 解析環境設定
  const environments = parseCfgFiles(project, cfgsDir, warnings);

  return {
    editions: gpuResult.editions,
    modelComponents: modelResult.components,
    environments,
    warnings,
  };
}

/**
 * 解析 src/cfgs/*.cfg.ts 環境設定檔。
 */
function parseCfgFiles(
  project: Project,
  cfgsDir: string,
  warnings: string[]
): ParsedEnvironment[] {
  const environments: ParsedEnvironment[] = [];

  const files = fs
    .readdirSync(cfgsDir)
    .filter((f) => f.endsWith(".cfg.ts") && !f.startsWith("@"));

  for (const fileName of files) {
    const filePath = path.join(cfgsDir, fileName);
    try {
      const sourceFile = project.getSourceFile(filePath);
      if (!sourceFile) {
        warnings.push(`Cfg parser: 無法讀取 ${fileName}`);
        continue;
      }

      const classes = sourceFile.getClasses();
      if (classes.length === 0) {
        warnings.push(`Cfg parser: ${fileName} 中找不到 class`);
        continue;
      }

      const cls = classes[0];

      const nameProp = cls.getProperty("name");
      const stageProp = cls.getProperty("stage");
      const editionProp = cls.getProperty("edition");

      const name = getStringInit(nameProp);
      const stage = getStringInit(stageProp);
      const edition = getStringInit(editionProp);

      if (name && stage && edition) {
        environments.push({ name, stage, edition, fileName });
      } else {
        warnings.push(
          `Cfg parser: ${fileName} 缺少必要欄位 (name=${name}, stage=${stage}, edition=${edition})`
        );
      }
    } catch (err) {
      warnings.push(
        `Cfg parser: 解析 ${fileName} 失敗 — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return environments;
}

/** 從 property 取得字串初始值 */
function getStringInit(
  prop: ReturnType<import("ts-morph").ClassDeclaration["getProperty"]>
): string | null {
  if (!prop) return null;
  const init = prop.getInitializer();
  if (!init) return null;
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }
  return null;
}
