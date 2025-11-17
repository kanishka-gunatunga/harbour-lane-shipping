-- Harbour Lane Shipping Module Database Schema
-- MySQL 5.7+ compatible

CREATE DATABASE IF NOT EXISTS harbour_lane_shipping;

USE harbour_lane_shipping;

CREATE TABLE warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    suburb VARCHAR(100),
    state VARCHAR(50),
    postcode VARCHAR(10),
    status ENUM('active','inactive') DEFAULT 'active',
    shopify_location_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    postcode VARCHAR(10) NOT NULL,    -- store '3000' or '30*' for prefixes/wildcards
    prefix BOOLEAN DEFAULT FALSE,     -- true if postcode stored as prefix pattern
    note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    INDEX idx_postcode (postcode),
    INDEX idx_warehouse_id (warehouse_id)
);

CREATE TABLE inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_order_id BIGINT NULL,         -- when order exists
    draft_order_id BIGINT NULL,        -- if draft created
    customer_name VARCHAR(150),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    postcode VARCHAR(10),
    product_details TEXT,
    status ENUM('new','reviewed','closed') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_postcode (postcode)
);

