// import { NextApiRequest, NextApiResponse } from 'next';
// import { exec } from 'child_process';
// import path from 'path';

// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }

//   // Get absolute path to the script
//   const scriptPath = path.resolve(process.cwd(), '../../../../agentkit/run-agent.ts');

//   // Execute the script
//   exec(`npx ts-node ${scriptPath}`, (error, stdout, stderr) => {
//     if (error) {
//       return res.status(500).json({ error: error.message, stderr });
//     }
//     res.status(200).json({ message: 'Command executed', stdout });
//   });
// }
import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
    const scriptPath = `"D:\\new\\lasst\\VibeMintTmp\\agentkit\\run-agent.ts"`;

  return new Promise((resolve) => {
    exec(`npx ts-node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ error: error.message, stderr }, { status: 500 }));
      }
      resolve(NextResponse.json({ message: 'Command executed', stdout }));
    });
  });
}
