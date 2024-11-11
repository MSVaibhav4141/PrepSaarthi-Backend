const fs = require('fs');
const readline = require('readline');

async function main() {
  const { default: chalk } = await import('chalk');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const fields = [
    { key: 'DB_URL', prompt: 'Enter value for DB_URL: ', required: true },
    { key: 'PORT', prompt: 'Enter value for PORT (default 5000): ', defaultValue: '5000', required: false },
    { key: 'JWT_SEC', prompt: 'Enter value for JWT_SEC: ', required: true },
    { key: 'JWT_EXP', prompt: 'Enter value for JWT_EXP (default 2d): ', defaultValue: '2d', required: false },
    { key: 'COOKIE_EXP', prompt: 'Enter value for COOKIE_EXP (default 2): ', defaultValue: '2', required: false },
    { key: 'SMTP_HOST', prompt: 'Enter value for SMTP_HOST: ', required: true },
    { key: 'SMTP_PORT', prompt: 'Enter value for SMTP_PORT: ', required: true },
    { key: 'SMTP_MAIL', prompt: 'Enter value for SMTP_MAIL: ', required: true },
    { key: 'SMTP_PASS', prompt: 'Enter value for SMTP_PASS: ', required: true },
    { key: 'FRONTEND_URL', prompt: 'Enter value for FRONTEND_URL (default localhost:3000): ', defaultValue: 'localhost:3000', required: false },
    { key: 'CLOUDINARY_NAME', prompt: 'Enter value for CLOUDINARY_NAME: ', required: true },
    { key: 'CLOUDINARY_API_KEY', prompt: 'Enter value for CLOUDINARY_API_KEY: ', required: true },
    { key: 'CLOUDINARY_API_SECRET', prompt: 'Enter value for CLOUDINARY_API_SECRET: ', required: true },
    { key: 'ALLOWEDORIGIN1', prompt: 'Enter value for ALLOWEDORIGIN1 (default http://localhost:3000): ', defaultValue: 'http://localhost:3000', required: false },
    { key: 'ALLOWEDORIGIN2', prompt: 'Enter value for ALLOWEDORIGIN2 (default http://localhost:3500): ', defaultValue: 'http://localhost:3500', required: false },
    { key: 'TEXTSMS', prompt: 'Enter value for TEXTSMS (Optional): ', optional: true },
    { key: 'RAZORPAYID', prompt: 'Enter value for RAZORPAYID (Optional): ', optional: true },
    { key: 'RAZORPAYKEY', prompt: 'Enter value for RAZORPAYKEY (Optional): ', optional: true }
  ];

  const askQuestions = async (index = 0, config = {}) => {
    if (index === fields.length) {
      config['PRCTRMAIL'] = 'sample@sample.com';

      const configContent = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      fs.writeFileSync('./config.env', configContent);
      console.log(chalk.yellow('Successfully created config.env file!'));
      rl.close();
      return;
    }

    const { key, prompt, defaultValue, required, optional } = fields[index];

    rl.question(chalk.blue(prompt), (answer) => {
      if (required && answer.trim() === '') {
        console.log(chalk.red('This field is required. Please provide a valid value.'));
        askQuestions(index, config);
      } else {
        config[key] = answer.trim() || defaultValue || '';
        askQuestions(index + 1, config);
      }
    });
  };

  console.log(chalk.green('Creating config.env file for you...'));

  askQuestions();
}

main();
