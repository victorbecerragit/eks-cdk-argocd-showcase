#!/bin/bash

# AWS EKS CDK & ArgoCD Showcase - CloudFormation Template Generation Script
# This script generates CloudFormation templates for all environments (dev, staging, prod)
# CDK code is located in the /iac directory

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

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Change to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
IAC_DIR="$PROJECT_ROOT/iac"
cd "$PROJECT_ROOT"

print_header "AWS EKS CDK & ArgoCD Showcase - Template Generation"
print_info "Project Root: $PROJECT_ROOT"
print_info "IaC Directory: $IAC_DIR"

# Verify IaC directory exists
if [ ! -d "$IAC_DIR" ]; then
    print_error "IaC directory not found at: $IAC_DIR"
    echo "Please ensure the repository structure is correct."
    exit 1
fi

# Step 1: Install dependencies
print_header "Step 1: Installing Dependencies"
if [ ! -d "$IAC_DIR/node_modules" ]; then
    print_info "Installing npm dependencies in $IAC_DIR..."
    cd "$IAC_DIR"
    npm install
    print_success "Dependencies installed"
    cd "$PROJECT_ROOT"
else
    print_info "node_modules already exists in $IAC_DIR, skipping npm install"
fi

# Step 2: Verify TypeScript compilation
print_header "Step 2: Compiling TypeScript"
print_info "Building TypeScript in $IAC_DIR..."
cd "$IAC_DIR"
npm run build
if [ $? -ne 0 ]; then
    cd "$PROJECT_ROOT"
    print_error "TypeScript build failed"
    exit 1
fi
print_success "TypeScript build completed"
cd "$PROJECT_ROOT"

# Step 3: Generate CloudFormation templates
print_header "Step 3: Generating CloudFormation Templates"

print_info "Synthesizing CDK app for all environments in $IAC_DIR..."
cd "$IAC_DIR"
npx cdk synth
if [ $? -ne 0 ]; then
    cd "$PROJECT_ROOT"
    print_error "CDK synthesis failed"
    exit 1
fi
print_success "CloudFormation templates generated successfully"
cd "$PROJECT_ROOT"

# Step 4: Summarize generated artifacts
print_header "Step 4: Summary of Generated Artifacts"

print_info "CloudFormation Templates Generated (in iac/cdk.out/):"
echo ""
ls -lh "$IAC_DIR/cdk.out"/*.template.json 2>/dev/null | awk '{printf "  %-60s %6s\n", $9, $5}'

echo ""
print_info "Total Files in iac/cdk.out/:"
echo "  $(find "$IAC_DIR/cdk.out" -type f 2>/dev/null | wc -l) files"

# Final summary
print_header "Generation Complete"

print_success "All templates generated successfully!"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Review the generated templates in: iac/cdk.out/"
echo "  2. Deploy with: npm run deploy (from root)"
echo "  3. Or use: ./scripts/quick-reference.sh for more commands"
echo "  4. See docs/DEPLOYMENT_CHECKLIST.md for step-by-step deployment"
echo ""
