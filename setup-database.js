import { pool } from './database/config.js';

const createTables = async () => {
  try {
    console.log('Creating database tables...');

    // Drop existing tables if they exist (to recreate with correct schema)
    console.log('Dropping existing tables...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DROP TABLE IF EXISTS notifications');
    await pool.query('DROP TABLE IF EXISTS applications');
    await pool.query('DROP TABLE IF EXISTS skill_swaps');
    await pool.query('DROP TABLE IF EXISTS projects');
    await pool.query('DROP TABLE IF EXISTS user_skills');
    await pool.query('DROP TABLE IF EXISTS skills');
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Old tables dropped');

    // Users table with all required columns
    await pool.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        bio TEXT,
        avatar VARCHAR(255) DEFAULT NULL,
        profile_picture VARCHAR(255),
        available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // User Skills table (used by auth.js)
    await pool.query(`
      CREATE TABLE user_skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        skill VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ User Skills table created');

    // Skills table (if used elsewhere)
    await pool.query(`
      CREATE TABLE skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        skill_name VARCHAR(255) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Skills table created');

    // Projects table
    await pool.query(`
      CREATE TABLE projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        creator_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        required_skills TEXT,
        status ENUM('open', 'in_progress', 'completed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Projects table created');

    // Skill Swaps table
    await pool.query(`
      CREATE TABLE skill_swaps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        skill_offered VARCHAR(255) NOT NULL,
        skill_requested VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('open', 'matched', 'completed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Skill Swaps table created');

    // Applications table
    await pool.query(`
      CREATE TABLE applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        applicant_id INT NOT NULL,
        message TEXT,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Applications table created');

    // Notifications table
    await pool.query(`
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Notifications table created');

    console.log('\n✅ All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
};

createTables();