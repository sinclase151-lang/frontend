Cypress.Commands.add('loginComo', (documento, password) => {
  cy.visit('/login');
  cy.get('#login-user').clear().type(documento);
  cy.get('#login-password').clear().type(password);
  cy.contains('button', 'Iniciar sesion').click();
  cy.url().should('not.include', '/login');
});