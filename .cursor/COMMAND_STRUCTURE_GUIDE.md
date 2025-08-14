# Optimal Command Structure for AI Assistant

## Best Practices for Clear Commands

### 1. Mode Declaration
Always start with the mode:
- `Planner mode:` - For analysis, strategy, and planning
- `Executor mode:` - For implementation and coding

### 2. Command Structure Template

```
[MODE]: [SPECIFIC TASK]

Context:
- [Current state/what was just completed]
- [Any constraints or requirements]
- [Any specific files or areas to focus on]

Goal:
- [Clear, specific outcome desired]

Success Criteria:
- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]
- [ ] [Measurable criterion 3]
```

### 3. Examples of Well-Structured Commands

#### GOOD Example 1:
```
Planner mode: Design Stripe integration architecture

Context:
- We have removed all Stripe code
- Database still has stripe columns (stripe_customer_id, etc)
- Need to support invoice creation and payment processing

Goal:
- Create a phased plan for implementing Stripe from scratch

Success Criteria:
- [ ] Identify minimum viable Stripe features
- [ ] Define clear implementation phases
- [ ] List specific API endpoints needed
```

#### GOOD Example 2:
```
Executor mode: Implement Stripe customer creation

Context:
- Following phase 1 of the plan
- Need to create customers when patient is created
- Must update patients table with stripe_customer_id

Goal:
- Add Stripe customer creation to patient registration flow

Success Criteria:
- [ ] Install stripe package
- [ ] Create stripe config with env vars
- [ ] Add createCustomer function
- [ ] Test with Stripe CLI
```

### 4. Commands to Avoid

#### BAD Example 1:
```
fix stripe
```
(Too vague, no context, no clear goal)

#### BAD Example 2:
```
Make everything work with payments and invoices and webhooks
```
(Too many things at once, no clear priority)

#### BAD Example 3:
```
Copy the stripe integration from that other project
```
(No specific details about what to copy or adapt)

### 5. Tips for Optimal Performance

1. **One Task at a Time**
   - Break complex features into smaller tasks
   - Complete and test each before moving on

2. **Provide File Context**
   - Mention specific files if relevant
   - Include error messages or logs

3. **State Dependencies**
   - What needs to be done first?
   - What can be done in parallel?

4. **Include Constraints**
   - Testing requirements
   - Security considerations  
   - Performance needs

5. **Define "Done"**
   - How will we know the task is complete?
   - What should be tested?

### 6. For Complex Features

Use this expanded template:

```
[MODE]: [FEATURE NAME]

Background:
- [Why this feature is needed]
- [Current system state]

Requirements:
1. [Functional requirement 1]
2. [Functional requirement 2]
3. [Non-functional requirement]

Constraints:
- [Time/budget/technical constraints]
- [Must maintain compatibility with X]

Phases (if applicable):
1. [Phase 1 - Basic functionality]
2. [Phase 2 - Enhanced features]
3. [Phase 3 - Optimizations]

Success Metrics:
- [ ] [User can do X]
- [ ] [System handles Y]
- [ ] [No regression in Z]
```

### 7. For Debugging/Fixes

```
[MODE]: Fix [SPECIFIC ISSUE]

Error:
- [Exact error message]
- [When it occurs]
- [What was attempted]

Context:
- [Recent changes made]
- [Working vs broken state]

Goal:
- [Make X work without breaking Y]

Already Tried:
- [Solution 1 - why it failed]
- [Solution 2 - what happened]
```

## Summary

The clearer and more structured your commands, the better I can:
1. Understand the exact requirement
2. Avoid assumptions and hallucinations
3. Focus on the right files and code
4. Measure progress accurately
5. Know when the task is complete

Remember: It's better to give too much context than too little!
