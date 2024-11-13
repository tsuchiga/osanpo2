import { subCategoryInput } from '../../../lib/subCategoryInput';

export async function POST() {
    try {
        await subCategoryInput(); 
    } catch (error) {
        console.error(error);
    }
}