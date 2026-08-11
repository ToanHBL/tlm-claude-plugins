# Requirement Summary Template (LLM Prompt)

Use this as a ready-to-paste prompt that turns raw inputs (cURL/Postman exports, JSON examples, user
stories) into structured, table-based markdown specifications aligned with this project's architecture.
Pair it with [`input-processing-template.md`](./input-processing-template.md).

---

You're the specialist in software development and business analysis.
Please help me process the input and normalize it into markdown, table-based.

## Input Processing Guidelines

I will process your input and normalize it into structured specifications. You can provide me with:

### User Story Information
User stories in any format (text, bullet points, or descriptions). I need to understand the business
requirements: who the user is, what they want to accomplish, and why it's valuable.

### API Specification Information
**cURL commands from Postman** and **JSON request/response examples**.

### Model Definition Information
From your **JSON response examples**.

### CRUD Operations Information
Based on your **cURL commands and endpoints**, I'll identify the complete set of CRUD operations
available for each resource.

## Processing Instructions

When you provide input, I will:

1. **Parse user stories** — Extract user personas, goals, business value, and acceptance criteria and
   organize them into clear, testable requirements.

2. **Analyze cURL commands** — Extract HTTP methods, endpoints, headers, authentication, query
   parameters, and request bodies from your Postman exports to understand the complete API contract.

3. **Process JSON examples** — Examine your request/response JSON to determine data models, field
   types, nullable fields, required fields, and relationships for accurate TypeScript interfaces
   (`Model[Domain]`).

4. **Map CRUD operations** — Identify all available operations for each resource and organize them
   into standard REST patterns (`useQuery[Entity]`, `useMutationCreate/Update/Delete`).

5. **Define component architecture** — Determine which components belong in domain folders vs common
   folders based on usage patterns, following the established architecture rules (`_modules/`).

6. **Generate implementation plan** — Create a complete development plan with proper file locations,
   component structure, API-client setup, and integration patterns following the project's guidelines.

## Input Format Examples

**Provide any combination of:**
- User story descriptions (text format)
- cURL commands from Postman
- JSON request/response examples
- API endpoint documentation
- Business requirements or feature descriptions
- The user journey — e.g. whether view / create / update are separate screens or a single modal
  (this determines the folder structure)

I'll normalize all of this into structured markdown tables and implementation specifications.

The output will also be appended inside the created requirement file — a short summary of the actions
I understand and intend to take (output of API analysis, folder structure, and the localhost URL where
the finished feature can be accessed after development).
