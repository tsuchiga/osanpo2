// src/combi.ts

import { category, subCategory, subsubCategory } from '../lib/category'; 
import * as fs from 'fs/promises';

// 型定義
interface Category {
  value: string;
  label: string;
}

interface SubCategory {
  value: string;
  label: string;
  head: string; // 親 Category の value を参照
}

interface SubSubCategory {
  value: string;
  label: string;
  head: string; // 親 SubCategory の value を参照
}

interface CombinedCategory {
  value: string;
  label: string;
  children?: CombinedCategory[]; // 子カテゴリが存在する場合
}

/**
 * カテゴリデータを結合する関数
 * @param categories - メインカテゴリの配列
 * @param subCategories - サブカテゴリの配列
 * @param subsubCategories - サブサブカテゴリの配列
 * @returns 結合されたカテゴリの配列
 */
const combineData = (
  categories: Category[],
  subCategories: SubCategory[],
  subsubCategories: SubSubCategory[]
): CombinedCategory[] => {
  return categories.map((cat) => {
    const children = subCategories
      .filter((subCat) => subCat.head === cat.value)
      .map((subCat) => {
        const subChildren = subsubCategories
          .filter((subSubCat) => subSubCat.head === subCat.value)
          .map((subSubCat) => ({
            value: subSubCat.value,
            label: subSubCat.label,
          }));
        return {
          value: subCat.value,
          label: subCat.label,
          children: subChildren.length > 0 ? subChildren : undefined, // 子がない場合は undefined
        };
      });
    return {
      value: cat.value,
      label: cat.label,
      children: children.length > 0 ? children : undefined, // 子がない場合は undefined
    };
  });
};

/**
 * データを結合し、JSONとして出力およびファイルに保存する非同期関数
 */
export async function combi() {
  try {
    // データの結合
    const combinedData = combineData(category, subCategory, subsubCategory);

    // JSON 文字列に変換（インデントを付けて見やすく）
    const jsonData = JSON.stringify(combinedData, null, 2);

    // コンソールに出力
    console.log(jsonData);

    // JSON データをファイルに保存
    await fs.writeFile('combinedData.json', jsonData, 'utf-8');
    console.log('JSON データが combinedData.json に保存されました');
  } catch (error) {
    console.error('データの結合またはファイルへの書き込み中にエラーが発生しました:', error);
  }
}