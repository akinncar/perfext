# Spec: <browser>
The browser is the extensions, so a UI that shows to user configuration, and a JS worker that appends stuff to the browser page, and show suggestions, and applies when accepted.

## Summary
The browser extension must have two sides: UI and background.

### UI
The UI must be a react app, that renders the selected model, and and input to append API key for this model. The API for this model will be used to text improvement, and will consume user tokens to make this suggestions.
The UI should be very simple, only this options for now, add what else you think is necessary to configure, but limit yourself on not creating anything noisy, it should be clean and easy to manage and save.

### Background
This is where magic happens, the background should read user inputs of every input (excluding no-text inputs), and after some sleep time (like 5s, or maybe configurable now or in the future), it should call the api using the model selected by the user, using his API key.
For this, I'm not sure if we need a back-end, I will create a back-end instruction if you think is needed, use `back-end.md`.
If something is not good, AI should evaluate and judge the text:
text should be highlighted with:
Red: Is wrong, like typos, or something that doesn't read well.
Yellow: Almost good, but AI have a good suggestion for it.
No highlight: All good

for hightlighted texts, when user hover mouse in the word/sentence, a Popover should display (like Gramarly style), with the suggestion, user can Accept, or Deny.
Denied textx will show a gray hightlight and user can re-visit the popover and change his mind.