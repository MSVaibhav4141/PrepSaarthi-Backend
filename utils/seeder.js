const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const cliProgress = require("cli-progress");
const readline = require("readline");
const Student = require("../models/studentModel");
const Mentor = require("../models/mentorModel");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../config.env") });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const generateRandomEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 10);
  const domains = ["@example.com", "@sample.com", "@random.org"];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `sample_${randomString}${randomDomain}`;
};

function generateRandomMobileNumber() {
  const firstDigit = Math.floor(Math.random() * 9);
  const remainingDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  return `${firstDigit}${remainingDigits}`;
}

const seedDatabase = async () => {
  const { default: chalk } = await import("chalk");

  try {
    rl.question(
      "Do you want to reset the database and have new records or push these records to the existing one? (reset/push): ",
      async (answer) => {
        const action = answer.toLowerCase().trim();

        const progressBar = new cliProgress.SingleBar({
          format: chalk.green(
            "Fetching Data |{bar}| {percentage}% | {value}/{total} Bytes"
          ),
          barCompleteChar: "\u2588",
          barIncompleteChar: "\u2591",
          hideCursor: true,
        });

        const userDataUrl =
          process.env.USER_DATA_URL ||
          "https://cdn.jsdelivr.net/gh/MSVaibhav4141/sampleData/sample.json";

        progressBar.start(100, 0);

        const { data } = await axios.get(userDataUrl, {
          onDownloadProgress: (progressEvent) => {
            const totalBytes = progressEvent.total || 100;
            const loadedBytes = progressEvent.loaded;
            progressBar.setTotal(totalBytes);
            progressBar.update(loadedBytes);
          },
        });

        progressBar.stop();

        if (action === "reset") {
          console.log(
            chalk.yellow("Resetting database and deleting existing data...")
          );
          await Student.deleteMany({});
          await Mentor.deleteMany({});
          console.log(chalk.yellow("Existing data deleted."));
        } else if (action === "push") {
          console.log(
            chalk.green("Pushing records into the existing database...")
          );
          data[0].email = generateRandomEmail();
          console.log(chalk.blue(`Student's Email - ${data[0].email}`));
          data[1].email = generateRandomEmail();
          console.log(chalk.magenta(`Mentor's Email - ${data[1].email}`));
          data[0].mobileNumber = generateRandomMobileNumber();
          data[1].mobileNumber = generateRandomMobileNumber();
        } else {
          console.log(chalk.red("Invalid choice. Exiting..."));
          rl.close();
          process.exit(1);
        }

        await Student.insertMany(data[0]);
        await Mentor.insertMany(data[1]);

        console.log(chalk.green("Database seeded successfully! Enjoy!"));
        rl.close();
        process.exit(0);
      }
    );
  } catch (error) {
    console.error(chalk.red("Error seeding database:"), error);
    rl.close();
    process.exit(1);
  }
};

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => seedDatabase())
  .catch((error) => {
    console.error(chalk.red("Error connecting to MongoDB:"), error);
    process.exit(1);
  });
