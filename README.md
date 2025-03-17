# PrepSaarthi 🎯  

PrepSaarthi is a publicly available, live-running mentorship platform designed to connect JEE aspirants with experienced mentors from IITs and top-tier colleges. Unlike traditional tuition classes, PrepSaarthi focuses on personalized guidance, strategic exam preparation, and mentorship to help students crack JEE.  

## 🚀 Live Website  
🔗 [PrepSaarthi](https://www.prepsaarthi.com)  

## 📌 Key Features  

### 🏫 **For Aspirants**  
✅ Chat with multiple mentors for free to choose the best fit.  
✅ Track subject-wise progress and mentorship status via the dashboard.  
✅ Get personalized guidance from experienced mentors.  

### 🎓 **For Mentors**  
✅ Set custom pricing for mentorship services.  
✅ Manage students and mentorship sessions through a dedicated dashboard.  
✅ Provide one-on-one guidance to help students excel.  
✅ (Upcoming) Upload and share video lessons (currently unavailable as mentors haven't uploaded videos yet).  

### 🔧 **For Admin**  
✅ Monitor platform analytics and user activity.  
✅ Manage student and mentor registrations.  
✅ Maintain platform integrity with administrative controls.  

## 💡 Tech Stack  
- **Frontend**: React.js, MUI
- **Backend**: Node.js, Express.js  
- **Database**: MongoDB  
- **Authentication**: JWT  
- **Real-Time Chat**: Socket.io  
- **Payment Gateway**: Razorpay

## 📸 Screenshots  
Once the user is logged in they can see the profile of the mentors
![image](https://github.com/user-attachments/assets/b02d7abd-fece-4523-a298-68813e7673f2)

Syllbus Tracker 
![Screenshot 2025-03-17 013813](https://github.com/user-attachments/assets/8357fdc4-c2ba-4c24-91f6-a82e5f4fa401)

Thourough review of metnor's payments
![image](https://github.com/user-attachments/assets/3063ddb1-c2f0-4fe2-a3e8-0a0c56118126)

Admin dashboard analytic page
![image](https://github.com/user-attachments/assets/b567fdcb-28e9-4ec4-8584-a24a58086d4e)

More features of admin dashboard
![image](https://github.com/user-attachments/assets/2d6f01a8-eae4-49e3-89b2-4d3130bbbba4)



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
