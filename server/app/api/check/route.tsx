import { checkAndUpdateKnowledgeBase } from "@/flows/update-knowledge";
import { NextRequest } from "next/server";
import chalk from 'chalk';

// Force chalk to always output colors, even when piped through tee
chalk.level = 3; // 0 = disabled, 1 = basic, 2 = 256 colors, 3 = truecolor

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const useRandom = searchParams.get('random') !== null;
  
  console.log(chalk.bgMagenta.black.bold('\n\n\n ============================================================ '));
  console.log(chalk.bgMagenta.black.bold(' 🔍  API ENDPOINT: /api/check                                '));
  console.log(chalk.bgMagenta.black.bold(' ============================================================ '));
  console.log(chalk.yellowBright.bold('\n📊 Check Configuration:'));
  console.log(chalk.cyanBright('  • Mode:'), chalk.whiteBright(useRandom ? '🎲 Random Single QA' : '📋 All QA Entries'));
  console.log(chalk.cyanBright('  • Timestamp:'), chalk.gray(new Date().toISOString()));
  console.log(chalk.gray('\n' + '─'.repeat(60)));
  
  try {
    console.log(chalk.greenBright.bold('\n▶️  Initiating Knowledge Base Check...'));
    console.log(chalk.cyan('⏳'), chalk.gray('Starting validation process...'));
    await checkAndUpdateKnowledgeBase(useRandom);
    
    console.log(chalk.bgGreen.black.bold('\n ✅  CHECK COMPLETED SUCCESSFULLY                            '));
    console.log(chalk.gray('═'.repeat(60) + '\n'));
    
    return new Response(JSON.stringify({ 
      status: 'success',
      mode: useRandom ? 'random' : 'all',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.log(chalk.bgRed.white.bold('\n ❌  CHECK FAILED                                            '));
    console.log(chalk.redBright('  Error:'), chalk.red(error instanceof Error ? error.message : String(error)));
    if (error instanceof Error && error.stack) {
      console.log(chalk.gray('\nStack Trace:'));
      console.log(chalk.gray(error.stack));
    }
    console.log(chalk.gray('═'.repeat(60) + '\n'));
    
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}