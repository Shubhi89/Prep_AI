import { db } from '@/firebase/admin';
import { getRandomInterviewCover } from '@/lib/utils';
import {google} from '@ai-sdk/google';
import {generateText} from 'ai';

export async function GET() {
    return Response.json({success:true , data: 'thankyou'} , {status:200});
}

export async function POST(request: Request) {
    const {type , role , level, techstack , amount , userid} = await request.json();
    try {
        const {text : questions} = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: `Prepare questions for a job interview. The job role is ${role} , level is ${level} and techstack is ${techstack}. Generate ${amount} questions. The focus between behavioural and technical questions should lean towards ${type} questions. Please return only the questions , without any additional text. The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters that might break the voice assistant. Return the questions formatted like this : ["Question 1" , "Question2" , "Question 3"] Thank you!`,
        });

        const interview = {
            role,type,level,
            techstack : techstack.split(','),
            questions : JSON.parse(questions),
            userId: userid,
            finalized:true,
            coverImage : getRandomInterviewCover(),
            createdAt : new Date().toISOString()
        }
        console.log(questions);
        console.log(interview);
        await db.collection('interviews').add(interview);
        return Response.json({success:true , data: 'thankyou'} , {status:200});
    } catch (error) {
        console.log("Error generating code:" , error);
        return Response.json({success:false , message: 'Failed to generate code'} , {status:500});
    }  
}