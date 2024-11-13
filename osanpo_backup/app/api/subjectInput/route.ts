import { subjectFix } from '../../../lib/subjectInput';

export async function POST() {
    try {
        await subjectFix(); 
    } catch (error) {
        console.error(error);
    }
}