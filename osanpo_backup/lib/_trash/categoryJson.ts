import { subsubCategory } from './category';
import { promises as fs } from 'fs';

export async function categoryJson() {
  // subsubCategory 配列を head ごとにグループ化し、重複を除いた label の配列を作成
  const result = subsubCategory.reduce((acc, { head, label }) => {
    if (!acc[head]) {
      acc[head] = [];
    }
    // 重複チェック
    if (!acc[head].includes(label)) {
      acc[head].push(label);
    }
    return acc;
  }, {} as { [key: string]: string[] });

  // JSON文字列に変換（整形付き）
  const jsonString = JSON.stringify(result, null, 2);

  // 出力先のファイルパスを設定（lib/output.json）
  const outputPath = './lib/output.json';

  try {
    // 'lib'ディレクトリが存在しない場合は作成する
    await fs.mkdir('./lib', { recursive: true });

    // JSONファイルとして書き込む
    await fs.writeFile(outputPath, jsonString, 'utf8');
    console.log(`JSONファイルが正常に出力されました: ${outputPath}`);
  } catch (error) {
    console.error('JSONファイルの出力中にエラーが発生しました:', error);
  }
}