-- SQL Script to verify Invoice tables structure
-- Run this in your SQL Server Management Studio or Azure Data Studio

-- Check if Invoice table exists and view its structure
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoice')
BEGIN
    SELECT 'Invoice table exists' AS Status
    
    -- Show table structure
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Invoice'
    ORDER BY ORDINAL_POSITION
END
ELSE
BEGIN
    SELECT 'Invoice table does NOT exist' AS Status
END

-- Check if InvoiceItem table exists and view its structure
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InvoiceItem')
BEGIN
    SELECT 'InvoiceItem table exists' AS Status
    
    -- Show table structure
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'InvoiceItem'
    ORDER BY ORDINAL_POSITION
END
ELSE
BEGIN
    SELECT 'InvoiceItem table does NOT exist' AS Status
END

-- Show indexes
SELECT 
    i.name AS IndexName,
    t.name AS TableName,
    c.name AS ColumnName,
    i.is_unique,
    i.type_desc
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name IN ('Invoice', 'InvoiceItem')
ORDER BY t.name, i.name, ic.key_ordinal