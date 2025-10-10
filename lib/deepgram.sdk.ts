import {createClient , AgentEvents} from '@deepgram/sdk';
import { writeFile , appendFile} from 'fs/promises';
import fetch from 'cross-fetch';
import { join } from 'path';

const deepgram = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);

const agent = async() => {

}

void agent();