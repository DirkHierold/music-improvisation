import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;

    /* Prevent text selection and touch callouts on all elements */
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;

    /* Prevent touch callout menu on iOS */
    -webkit-touch-callout: none;

    /* Prevent tap highlighting on mobile */
    -webkit-tap-highlight-color: transparent;
  }

  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-color: #282828;
    color: #d3d3d3;
    overflow: hidden;

    /* Prevent text selection on body */
    user-select: none;
    -webkit-user-select: none;

    /* Disable touch actions that interfere with gestures */
    touch-action: manipulation;
  }

  button {
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  /* Allow text selection only for input fields if any are added later */
  input, textarea {
    user-select: text;
    -webkit-user-select: text;
  }
`;