import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const indexHtml = join(distDir, 'index.html');

// index.htmlが存在するか確認
if (!existsSync(indexHtml)) {
  console.error('✗ Error: dist/index.html not found. Please run build first.');
  process.exit(1);
}

// customer-paths.jsonからパスリストを読み込み
let customerPaths = ['test']; // デフォルト値
try {
  const configPath = join(process.cwd(), 'customer-paths.json');
  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    customerPaths = config.paths || ['test'];
    console.log(`✓ Loaded customer paths: ${customerPaths.join(', ')}`);
  } else {
    console.warn('⚠ Warning: customer-paths.json not found. Using default: test');
  }
} catch (error) {
  console.warn('⚠ Warning: Could not read customer-paths.json:', error.message);
}

// 各顧客環境のサブパスに対して処理を実行
customerPaths.forEach(customerPath => {
  const customerDir = join(distDir, customerPath);
  
  // ディレクトリが存在しない場合は作成
  if (!existsSync(customerDir)) {
    mkdirSync(customerDir, { recursive: true });
  }

  // dist/index.html を dist/{customerPath}/index.html にコピー（パスを書き換え）
  const customerIndexHtml = join(customerDir, 'index.html');
  let htmlContent = readFileSync(indexHtml, 'utf-8');
  
  // HTML内のパスを各サブパス用に書き換え
  // /test/ を /{customerPath}/ に置換（ただし、base pathから取得）
  // vite.config.jsのbaseが /test/ の場合、それを /{customerPath}/ に置換
  const basePath = '/test/';
  const customerPathSlash = `/${customerPath}/`;
  htmlContent = htmlContent.replace(new RegExp(basePath.replace(/\//g, '\\/'), 'g'), customerPathSlash);
  
  writeFileSync(customerIndexHtml, htmlContent, 'utf-8');
  console.log(`✓ Copied and updated dist/index.html to dist/${customerPath}/index.html`);

  // assetsディレクトリを dist/{customerPath}/assets/ にコピー
  const assetsDir = join(distDir, 'assets');
  const customerAssetsDir = join(customerDir, 'assets');

  if (existsSync(assetsDir)) {
    // dist/{customerPath}/assets ディレクトリを作成
    if (!existsSync(customerAssetsDir)) {
      mkdirSync(customerAssetsDir, { recursive: true });
    }

    // assets ディレクトリ内のすべてのファイルをコピー
    const assetFiles = readdirSync(assetsDir);
    assetFiles.forEach(file => {
      const src = join(assetsDir, file);
      const dest = join(customerAssetsDir, file);
      if (statSync(src).isFile()) {
        copyFileSync(src, dest);
        console.log(`✓ Copied assets/${file} to dist/${customerPath}/assets/`);
      }
    });
  } else {
    console.warn(`⚠ Warning: dist/assets directory not found for ${customerPath}.`);
  }

  // 画像ファイルなどの静的アセットを dist/{customerPath}/ にコピー
  const filesToCopy = [];

  try {
    const files = readdirSync(distDir);
    files.forEach(file => {
      const filePath = join(distDir, file);
      // ディレクトリやassetsフォルダは除外
      if (statSync(filePath).isFile() && 
          !file.startsWith('.') && 
          file !== 'index.html' &&
          (file.endsWith('.png') || 
           file.endsWith('.svg') || 
           file.endsWith('.jpg') || 
           file.endsWith('.jpeg') || 
           file.endsWith('.gif') || 
           file.endsWith('.webp'))) {
        filesToCopy.push(file);
      }
    });

    filesToCopy.forEach(file => {
      const src = join(distDir, file);
      const dest = join(customerDir, file);
      copyFileSync(src, dest);
      console.log(`✓ Copied ${file} to dist/${customerPath}/`);
    });
  } catch (error) {
    console.warn(`⚠ Warning: Could not copy static files for ${customerPath}:`, error.message);
  }
});

console.log(`\n✓ Completed copying files for ${customerPaths.length} customer environment(s).`);

