import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

export default deepgram;