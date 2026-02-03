#!/bin/bash

# AWS EKS CDK & ArgoCD Showcase - CloudFormation Template Generation Script
# This script generates CloudFormation templates for all environments (dev, staging, prod)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Change to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

print_header "AWS EKS CDK & ArgoCD Showcase - Template Generation"
print_info "Project Root: $PROJECT_ROOT"

# Step 1: Install dependencies
print_header "Step 1: Installing Dependencies"
if [ ! -d "node_modules" ]; then
    print_info "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_info "node_modules already exists, skipping npm install"
fi

# Step 2: Verify TypeScript compilation
print_header "Step 2: Compiling TypeScript"
print_info "Building TypeScript..."
npm run build
print_success "TypeScript build completed"

# Step 3: Generate CloudFormation templates
print_header "Step 3: Generating CloudFormation Templates"

print_info "Synthesizing CDK app for all environments..."
npx cdk synth
print_success "CloudFormation templates generated successfully"

# Step 4: Summarize generated artifacts
print_header "Step 4: Summary of Generated Artifacts"

print_info "CloudFormation Templates Generated:"
echo ""
ls -lh cdk.out/*.template.json 2>/dev/null | awk '{printf "  %-60s %6s\n", $9, $5}'

echo ""
print_info "Total Files in cdk.out:"
echo "  $(find cdk.out -type f | wc -l) files"

# Final summary
print_header "Generation Complete"

print_success "All templates generated successfully!"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Review the generated templates in: cdk.out/"
echo "  2. Deploy with: npx cdk deploy --all -c environment=dev"
echo "  3. Or use: ./scripts/quick-reference.sh for more commands"
echo ""
