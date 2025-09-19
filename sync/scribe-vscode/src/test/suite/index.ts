import * as path from 'path';

export function run(): Promise<void> {
    // Since we're using vscode's built-in test runner, 
    // we'll implement a simpler test discovery
    const testFiles = [
        './extension.test.js'
    ];

    return new Promise((resolve, reject) => {
        try {
            // Import and run test files
            testFiles.forEach(file => {
                require(path.resolve(__dirname, file));
            });
            resolve();
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}