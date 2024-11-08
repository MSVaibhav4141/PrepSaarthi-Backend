const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const cliProgress = require("cli-progress");
const readline = require("readline");
const Student = require("../models/studentModel");
const Mentor = require("../models/mentorModel");
const path = require("path");

dotenv.config({path : path.join(__dirname, '../config.env')});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const seedDatabase = async () => {
  try {
    rl.question(
      "Do you want to reset the database and have new records or push these records to the existing one? (reset/push): ",
      async (answer) => {
        const action = answer.toLowerCase().trim();

        const progressBar = new cliProgress.SingleBar({
          format: "Fetching Data |{bar}| {percentage}% | {value}/{total} Bytes",
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
          console.log("Resetting database and deleting existing data...");
          await Student.deleteMany({});
          await Mentor.deleteMany({});
          console.log("Existing data deleted.");
        } else if (action === "push") {
          console.log("Pushing records into the existing database...");
        } else {
          console.log("Invalid choice. Exiting...");
          rl.close();
          process.exit(1);
          return;
        }
        await Student.insertMany(data[0]);
        await Mentor.insertMany(data[1]);

        console.log("Database seeded successfully! Enjoy!");
        rl.close();
        process.exit(0);
      }
    );
  } catch (error) {
    console.error("Error seeding database:", error);
    rl.close();
    process.exit(1);
}
};

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => seedDatabase())
.catch(error => {
    console.error('Error connecting to MongoDB:', error)
    process.exit(1);
});