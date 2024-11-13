import { subCategoryGet } from '../../../lib/subCategoryInput';

export async function POST() {
    try {
        await subCategoryGet(); 
    } catch (error) {
        console.error(error);
    }
}