import 'dotenv/config';               // <-- load .env
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function test() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Say hello' }],
    });
    console.log(completion.choices[0].message.content);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();