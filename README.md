## Setup Instructions

Follow the steps below to set up the project locally:

1. **Clone the repository**:
   Clone the project repository to your local machine using the following command:
   ```bash
   git clone https://github.com/MSVaibhav4141/PrepSaarthi-Backend.git

2. **Navigate to the project folder**:
   After cloning the repository, navigate into the project directory:
   ```bash
   cd PrepSaarthi-Backend
3. **Install dependencies**:
Install all required dependencies for the project. Run the following command in the root directory where package.json is located:
   ```bash
    npm install --force
4. **Create the .env file**:
The project requires an environment configuration file. To create the .env file, run:
   ```bash
    npm run create-env
This command will guide you through entering values for various environment variables. Once completed, the .env file will be generated.

5. **Seed the database**:
To populate the database with sample data, run
   ```bash
    npm run seed
This will insert initial data into the database to help you get started.

6. **Launch the development environment:**:
   After setting up the environment and seeding the database, start the development server with:
   ```bash
   npm run dev
PrepSaarthi's backend should now be running locally.
