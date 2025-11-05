-- Create Database
CREATE DATABASE IF NOT EXISTS collabmate;
USE collabmate;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar VARCHAR(500),
  links_json TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Skills Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_skill (skill)
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_creator_id (creator_id)
);

-- Project Required Skills Table
CREATE TABLE IF NOT EXISTS project_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  skill VARCHAR(100) NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id)
);

-- Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_member (project_id, user_id)
);

-- Project Applications Table
CREATE TABLE IF NOT EXISTS project_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT,
  status ENUM('pending','accepted','declined') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id)
);

-- Skill Swaps Table
CREATE TABLE IF NOT EXISTS skill_swaps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  offered_skill VARCHAR(100) NOT NULL,
  requested_skill VARCHAR(100) NOT NULL,
  message TEXT,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_from_user (from_user_id),
  INDEX idx_to_user (to_user_id)
);

-- Skill Swap Messages (threaded chat)
CREATE TABLE IF NOT EXISTS skill_swap_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  swap_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (swap_id) REFERENCES skill_swaps(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_swap_id (swap_id)
);

-- Skill Swap Status History (timeline)
CREATE TABLE IF NOT EXISTS skill_swap_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  swap_id INT NOT NULL,
  status ENUM('pending','accepted','declined') NOT NULL,
  changed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (swap_id) REFERENCES skill_swaps(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_swap_hist (swap_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(255),
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_unread (user_id, read_at)
);

-- Insert Sample Data (Optional)
-- Insert sample users (passwords are hashed with bcrypt - "password123")
INSERT INTO users (name, email, password, bio, avatar, available) VALUES
('Alice Johnson', 'alice@example.com', '$2a$10$rQWvP3KEW4nBLQ9H8F6z7OJ4WZC.KI9qG4Yq.N/Y8TlO5vU4vNqZu', 'Full-stack developer with a passion for creating beautiful and intuitive user interfaces.', 'https://picsum.photos/seed/alice/200', TRUE),
('Bob Williams', 'bob@example.com', '$2a$10$rQWvP3KEW4nBLQ9H8F6z7OJ4WZC.KI9qG4Yq.N/Y8TlO5vU4vNqZu', 'Data scientist focused on building predictive models and analyzing large datasets.', 'https://picsum.photos/seed/bob/200', FALSE),
('Charlie Brown', 'charlie@example.com', '$2a$10$rQWvP3KEW4nBLQ9H8F6z7OJ4WZC.KI9qG4Yq.N/Y8TlO5vU4vNqZu', 'Creative graphic designer specializing in branding and digital illustration.', 'https://picsum.photos/seed/charlie/200', TRUE);

-- Insert user skills
INSERT INTO user_skills (user_id, skill) VALUES
(1, 'React'), (1, 'Node.js'), (1, 'UI/UX Design'),
(2, 'Python'), (2, 'Data Science'), (2, 'Machine Learning'),
(3, 'Graphic Design'), (3, 'Illustration'), (3, 'Branding');

-- Insert projects
INSERT INTO projects (title, description, creator_id) VALUES
('Eco-Friendly Marketplace App', 'A mobile application to connect buyers and sellers of sustainable and eco-friendly products. We aim to build a community around conscious consumerism. We need a frontend developer to build the React Native app and a UI/UX designer to finalize the mockups.', 1),
('AI-Powered Personal Finance Advisor', 'Developing an AI tool that provides personalized financial advice based on user spending habits. The core of the project is a machine learning model that predicts future expenses and suggests savings strategies. We need data scientists and backend developers.', 2),
('Branding for a New Tech Startup', 'We are a new startup in the ed-tech space looking for a talented designer to create our complete brand identity. This includes a logo, color palette, typography, and marketing materials. Experience with modern and minimalist design is a plus.', 3);

-- Insert project skills
INSERT INTO project_skills (project_id, skill) VALUES
(1, 'React Native'), (1, 'UI/UX Design'), (1, 'Firebase'),
(2, 'Python'), (2, 'Machine Learning'), (2, 'Flask'),
(3, 'Branding'), (3, 'Logo Design'), (3, 'Illustration');

-- Insert project members (creators are automatically members)
INSERT INTO project_members (project_id, user_id) VALUES
(1, 1), (2, 2), (3, 3);

-- Insert skill swaps
INSERT INTO skill_swaps (from_user_id, to_user_id, offered_skill, requested_skill, message, status) VALUES
(2, 1, 'Python Basics', 'React Fundamentals', 'Hey Alice, I can teach you Python for data analysis if you could help me get started with React for a personal project. Let me know!', 'pending'),
(1, 3, 'Intro to Web Development', 'Logo Design Principles', 'Hi Charlie, I love your design work! I can give you a crash course on HTML/CSS/JS if you can teach me some logo design basics.', 'accepted');

