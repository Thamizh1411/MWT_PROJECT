require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');
const Admin = require('./models/Admin');

const seedData = async () => {
  await connectDB();
  try {
    const adminEmail = 'admin@workerbook.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error('SEED_ADMIN_PASSWORD must be set and at least 12 characters long');
    }
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);

    // 1. Seed Admin in User collection with role 'admin' AND legacy Admin collection
    const existingAdminUser = await User.findOne({ email: adminEmail });
    if (!existingAdminUser) {
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminHashedPassword,
        role: 'admin',
        isVerified: true,
        phone: '+18005550199'
      });
      console.log('Admin user seeded in User collection');
    }

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await Admin.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminHashedPassword,
        role: 'admin'
      });
      console.log('Admin seeded in Admin collection');
    }

    // 2. Seed Regular Users
    const userTemplates = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
        phone: '+1234567890',
        address: '123 Main St, City, State 12345',
        isVerified: true
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user',
        phone: '+1987654321',
        address: '456 Oak Ave, Town, State 67890',
        isVerified: true
      }
    ];

    for (const template of userTemplates) {
      const hashedPassword = await bcrypt.hash(template.password, 10);
      const userData = { ...template, password: hashedPassword };
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`User ${userData.name} seeded successfully`);
      }
    }

    // 3. Seed Workers (Verified and Pending Approval)
    const workerTemplates = [
      {
        name: 'Mike Johnson',
        email: 'mike@plumber.com',
        password: 'password123',
        role: 'worker',
        profession: 'Plumber',
        hourlyRate: 35,
        skills: ['Plumbing', 'Pipe Repair', 'Leak Fixing', 'Drainage'],
        experience: '5 years',
        phone: '+1112223333',
        address: '789 Pine Rd, City, State 12345',
        isVerified: true,
        verified: true,
        availability: true,
        rating: 4.8,
        totalJobs: 12
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah@electrician.com',
        password: 'password123',
        role: 'worker',
        profession: 'Electrician',
        hourlyRate: 45,
        skills: ['Wiring', 'Electrical Repair', 'Lighting', 'Circuit Breakers'],
        experience: '7 years',
        phone: '+1445556666',
        address: '101 Elm St, Town, State 67890',
        isVerified: true,
        verified: true,
        availability: true,
        rating: 4.9,
        totalJobs: 18
      },
      {
        name: 'Robert Carpentry',
        email: 'robert@carpenter.com',
        password: 'password123',
        role: 'worker',
        profession: 'Carpenter',
        hourlyRate: 30,
        skills: ['Custom Furniture', 'Cabinetry', 'Woodwork Repair'],
        experience: '4 years',
        phone: '+1555666777',
        address: '303 Cedar St, Metro, State 44332',
        isVerified: true,
        verified: true,
        availability: true,
        rating: 4.6,
        totalJobs: 8
      },
      {
        name: 'David Brown',
        email: 'david@pending.com',
        password: 'password123',
        role: 'worker',
        profession: 'Painter',
        hourlyRate: 25,
        skills: ['Interior Painting', 'Wall Finishing'],
        experience: '3 years',
        phone: '+1778889999',
        address: '202 Maple Dr, Village, State 11223',
        isVerified: true,
        verified: false, // Pending admin approval
        availability: false,
        rating: 0,
        totalJobs: 0
      }
    ];

    for (const template of workerTemplates) {
      const hashedPassword = await bcrypt.hash(template.password, 10);
      const workerData = { ...template, password: hashedPassword };
      const existingWorker = await User.findOne({ email: workerData.email });
      if (!existingWorker) {
        await User.create(workerData);
        console.log(`Worker ${workerData.name} seeded successfully`);
      }
    }

    console.log('[Seed] Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
