# Blueprint

## Overview

This document outlines the plan to improve the alarm messages for the war timer feature. The goal is to make the messages more natural in both Spanish and English, with correct pluralization.

## Current State

The current alarm message for early warnings is "Faltan [time]" in Spanish and "Missing [time]" in English. This sounds unnatural. The user wants to change it to "Quedan [time]" or "Queda [time]" in Spanish and a more appropriate English equivalent.

## Plan

1.  **Analyze `src/App.jsx`:** I will examine the component to locate the logic responsible for generating the alarm messages.
2.  **Modify `src/App.jsx`:**
    *   I will add new translation strings for the improved messages in both English and Spanish. I'll include strings for singular and plural forms.
    *   I will update the code that generates the alarm message to use these new translation strings and correctly handle singular vs. plural cases based on the remaining time.
3.  **Test:** I will ask the user to verify the changes.
