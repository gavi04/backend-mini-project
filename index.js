const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const prisma = new PrismaClient();
const app = express();

const JWT_SECRET = 'helloworld';

app.use(express.json());
app.use(cors());
// Create a User
app.post('/signup', async (req, res) => {
  const { email, password,  name } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, password,  name },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
//login for admin
app.post('/adminlogin', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const user = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true,  password: true },  // Don't include password
    });

    if (!user || user.password !== password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET
    );

    // Return the token to the client
    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
   
// Login Endpoint with JWT
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true,  password: true },  // Don't include password
      });
  
      if (!user || user.password !== password) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
  
      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET
      );
  
      // Return the token to the client
      res.json({ message: 'Login successful', token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Create a Job
app.post('/jobs', async (req, res) => {
  const { title, company, type, location, package, deadline, cgpaCutoff, description, applicationLink, status } = req.body;
  try {
    const job = await prisma.job.create({
      data: { title, company, type, location, package, deadline, cgpaCutoff, description, applicationLink, status },
    });
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create an Application
app.post('/applications', async (req, res) => {
  const { studentId, jobId, status } = req.body;
  try {
    const application = await prisma.application.create({
      data: { studentId, jobId, status },
    });
    res.json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Jobs
app.get('/jobs', async (req, res) => {
  try {
    const jobs = await prisma.job.findMany();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
////////////////////////////////////////////////////////////////////////////////////
// Get all Applications by User
// app.get('/users/:id/applications', async (req, res) => {
//   const { id } = req.params;
//   try {
//     const applications = await prisma.application.findMany({
//       where: { studentId: parseInt(id) },
//       include: { job: true },
//     });
//     res.json(applications);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
///////////////////////////////////////////////////////////////
app.get('/users/:id/applications', async (req, res) => {
  const { id } = req.params;
  try {
    const applications = await prisma.application.findMany({
      where: { studentId: parseInt(id) },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            deadline: true, // Ensure deadline is selected
            status: true
          }
        },
        student: true // To also include the user details
      },
    });

    
   

    // If the `appliedAt` field is not appearing in the response, you can manually format it
    const formattedApplications = applications.map(application => {
      return {
        ...application,
        appliedAt: new Date(application.appliedAt).toLocaleString(), // Format appliedAt date
        job: {
          ...application.job,
          deadline: new Date(application.job.deadline).toLocaleDateString('en-US'), // Format deadline date
        }
      };
    });

    res.json(formattedApplications);
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ error: error.message });
  }
});

///////////////////////////////////////////////////

// Update Application Status
app.patch('/applications/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const application = await prisma.application.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    res.json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a Job
// app.delete('/jobs/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     const job = await prisma.job.delete({
//       where: { id: parseInt(id) },
//     });
//     res.json(job);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });
app.delete('/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete related applications first
    await prisma.application.deleteMany({
      where: { jobId: parseInt(id) }
    });

    // Then delete the job
    const job = await prisma.job.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ message: 'Job and related applications deleted successfully', job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
