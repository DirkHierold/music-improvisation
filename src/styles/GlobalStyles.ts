import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-color: #282828;
    color: #d3d3d3;
    overflow: hidden;
  }

  button {
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
`;