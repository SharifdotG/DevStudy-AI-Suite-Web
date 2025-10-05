# Contributing Guide

Thanks for your interest in improving DevStudy AI Suite! This document outlines how to propose changes, report bugs, and keep the project healthy.

## Before You Start

- Review the [Product Requirements](PRD.md) to understand the current scope.
- Read the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by it.
- Check open issues before creating a new one to avoid duplicates.

## Development Workflow

1. **Fork and clone** the repository.
2. **Create a branch** off `main` using a descriptive prefix, for example `feature/chat-toolbar` or `fix/sql-tool-validation`.
3. **Install dependencies** with `npm install` and copy `.env.example` to `.env.local`.
4. **Run the dev server** with `npm run dev` and keep ESLint/type checking clean:
   - `npm run lint`
   - `npx tsc --noEmit`
5. **Write tests or add manual test notes** when adding new behaviors.
6. **Commit** using clear, imperative messages (e.g., `Add streaming UI for chatbot responses`).
7. **Push** and open a pull request following the template.

## Pull Request Checklist

- [ ] Lint passes (`npm run lint`).
- [ ] Type checks pass (`npx tsc --noEmit`).
- [ ] Updated or added documentation as needed (README, docs, inline comments).
- [ ] Added environment variable details to `.env.example` if applicable.
- [ ] Linked the associated issue or added clear context in the PR description.

## Reporting Bugs

Use the **Bug report** issue template and include:

- Reproduction steps (or a minimal code sample).
- Expected vs. actual behavior.
- Browser/OS details.
- Screenshots or error logs if relevant.

## Suggesting Enhancements

Open a **Feature request** issue describing:

- The problem the enhancement solves.
- Proposed solution sketch or user flow.
- Alternatives considered.

## Commit Standards

- Keep commits focused; avoid bundling unrelated changes.
- Reference issues or PRs when applicable (e.g., `Fix settings dialog scroll (closes #123)`).
- Avoid committing generated files or secrets.

## Communication

- Use GitHub Discussions or issues for questions.
- Prefer asynchronous updates with clear action items.

We appreciate every contribution, from documentation fixes to major features. Thank you for helping DevStudy AI Suite grow!
