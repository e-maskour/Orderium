#!/bin/bash

# Convert all PascalCase fields to camelCase in backoffice TSX files

cd /Users/emaskour/Desktop/projects/Orderium/backoffice/src

# Find all TSX files and convert property accesses
find . -name "*.tsx" -type f | while read file; do
  sed -i '' \
    -e 's/\.Id\>/\.id/g' \
    -e 's/\.Name\>/\.name/g' \
    -e 's/\.Price\>/\.price/g' \
    -e 's/\.Cost\>/\.cost/g' \
    -e 's/\.Stock\>/\.stock/g' \
    -e 's/\.Description\>/\.description/g' \
    -e 's/\.ImageUrl\>/\.imageUrl/g' \
    -e 's/\.IsEnabled\>/\.isEnabled/g' \
    -e 's/\.IsService\>/\.isService/g' \
    -e 's/\.Code\>/\.code/g' \
    -e 's/\.IsPriceChangeAllowed\>/\.isPriceChangeAllowed/g' \
    -e 's/\.CategoryId\>/\.categoryId/g' \
    -e 's/\.DateCreated\>/\.dateCreated/g' \
    -e 's/\.DateUpdated\>/\.dateUpdated/g' \
    -e 's/\.PhoneNumber\>/\.phoneNumber/g' \
    -e 's/\.Address\>/\.address/g' \
    -e 's/\.Email\>/\.email/g' \
    -e 's/\.TotalAmount\>/\.totalAmount/g' \
    -e 's/\.Status\>/\.status/g' \
    -e 's/\.CreatedAt\>/\.createdAt/g' \
    -e 's/\.UpdatedAt\>/\.updatedAt/g' \
    -e 's/\.City\>/\.city/g' \
    -e 's/\.IsSupplier\>/\.isSupplier/g' \
    -e 's/\.IsCustomer\>/\.isCustomer/g' \
    -e 's/\.IsActive\>/\.isActive/g' \
    -e 's/\.InvoiceNumber\>/\.invoiceNumber/g' \
    -e 's/\.CustomerId\>/\.customerId/g' \
    -e 's/\.PaymentStatus\>/\.paymentStatus/g' \
    -e 's/\.Customer\>/\.customer/g' \
    -e 's/\.Invoice\>/\.invoice/g' \
    -e 's/\.Phone\>/\.phone/g' \
    "$file"
done

# Convert object property definitions (Name: -> name:, etc.)
find . -name "*.tsx" -type f | while read file; do
  sed -i '' \
    -e 's/\([^a-zA-Z]\)Id: /\1id: /g' \
    -e 's/\([^a-zA-Z]\)Name: /\1name: /g' \
    -e 's/\([^a-zA-Z]\)Code: /\1code: /g' \
    -e 's/\([^a-zA-Z]\)Description: /\1description: /g' \
    -e 's/\([^a-zA-Z]\)Price: /\1price: /g' \
    -e 's/\([^a-zA-Z]\)Cost: /\1cost: /g' \
    -e 's/\([^a-zA-Z]\)Stock: /\1stock: /g' \
    -e 's/\([^a-zA-Z]\)IsService: /\1isService: /g' \
    -e 's/\([^a-zA-Z]\)IsEnabled: /\1isEnabled: /g' \
    -e 's/\([^a-zA-Z]\)IsPriceChangeAllowed: /\1isPriceChangeAllowed: /g' \
    -e 's/\([^a-zA-Z]\)ImageUrl: /\1imageUrl: /g' \
    -e 's/\([^a-zA-Z]\)PhoneNumber: /\1phoneNumber: /g' \
    -e 's/\([^a-zA-Z]\)Address: /\1address: /g' \
    -e 's/\([^a-zA-Z]\)Email: /\1email: /g' \
    -e 's/\([^a-zA-Z]\)City: /\1city: /g' \
    -e 's/\([^a-zA-Z]\)ProductId: /\1productId: /g' \
    -e 's/\([^a-zA-Z]\)Quantity: /\1quantity: /g' \
    -e 's/\([^a-zA-Z]\)CustomerId: /\1customerId: /g' \
    -e 's/\([^a-zA-Z]\)IsActive: /\1isActive: /g' \
    "$file"
done

# Convert interface definitions
find . -name "*.tsx" -type f | while read file; do
  sed -i '' \
    -e 's/^  Id: number;$/  id: number;/' \
    -e 's/^  Name: string;$/  name: string;/' \
    -e 's/^  Code: string/  code: string/' \
    -e 's/^  Description: string/  description: string/' \
    -e 's/^  Price: number;$/  price: number;/' \
    -e 's/^  Cost: number/  cost: number/' \
    -e 's/^  Stock\?: number/  stock?: number/' \
    -e 's/^  IsService: boolean/  isService: boolean/' \
    -e 's/^  IsEnabled: boolean/  isEnabled: boolean/' \
    -e 's/^  IsPriceChangeAllowed: boolean/  isPriceChangeAllowed: boolean/' \
    -e 's/^  ImageUrl\?: string/  imageUrl?: string/' \
    -e 's/^  PhoneNumber: string/  phoneNumber: string/' \
    -e 's/^  Address\?: string/  address?: string/' \
    -e 's/^  Email\?: string/  email?: string/' \
    -e 's/^  City\?: string/  city?: string/' \
    -e 's/^  IsActive: boolean/  isActive: boolean/' \
    "$file"
done

echo "Conversion complete!"
