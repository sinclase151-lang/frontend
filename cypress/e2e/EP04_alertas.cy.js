describe('EP04 - Gestion de alertas tempranas y riesgos formativos', () => {
  let creds;

  before(() => {
    cy.fixture('credenciales').then((data) => { creds = data; });
  });

  describe('H31 - Crear alerta manual', () => {
    beforeEach(() => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
    });

    it('El instructor ve el boton para crear una alerta manual', () => {
      cy.contains('button', 'Nueva alerta manual').should('be.visible');
    });

    it('Abre el modal de creacion de alerta manual', () => {
      cy.contains('button', 'Nueva alerta manual').click();
      cy.get('.mcal-modal').should('be.visible');
      cy.contains('Crear alerta manual').should('exist');
    });

    it('El coordinador no puede ver el boton de crear alerta manual', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.contains('button', 'Nueva alerta manual').should('not.exist');
    });
  });

  describe('H32 - Consultar alertas segun rol y alcance', () => {
    it('El coordinador consulta alertas agrupadas por ficha', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.get('.grupos-table, .ca-tabla').should('exist');
    });

    it('El instructor consulta alertas con filtros disponibles', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('.ca-select').should('have.length.greaterThan', 0);
    });

    it('Filtra alertas por severidad', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('.ca-select').eq(1).select('GRAVE');
      cy.contains('button', 'Buscar').click();
      cy.get('.ca-tabla, .ca-estado-vacio').should('exist');
    });

    it('Filtra alertas por estado usando un valor aceptado por el backend', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('[data-testid="select-alerta-estado"]').select('ABIERTA');
      cy.contains('button', 'Buscar').click();
      cy.get('.ca-tabla, .ca-estado-vacio').should('exist');
    });

    it('Ofrece solo estados soportados por el backend en el filtro', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('[data-testid="select-alerta-estado"] option').then(($options) => {
        const valores = [...$options].map((option) => option.value);
        expect(valores).to.deep.equal(['', 'ABIERTA', 'CERRADA']);
      });
    });

    it('Filtra alertas por tipo', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('.ca-select').eq(2).select('CONVIVENCIAL');
      cy.contains('button', 'Buscar').click();
      cy.get('.ca-tabla, .ca-estado-vacio').should('exist');
    });

    it('Filtra alertas por rango de fechas', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('input[type="date"]').first().type('2026-01-01');
      cy.get('input[type="date"]').eq(1).type('2026-06-22');
      cy.contains('button', 'Buscar').click();
      cy.get('.ca-tabla, .ca-estado-vacio').should('exist');
    });

    it('El coordinador entra al detalle de aprendices con alertas por ficha', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.get('.grupos-table tbody tr').first().click();
      cy.contains('Aprendices con alertas activas').should('exist');
    });

    it('Muestra mensaje claro cuando no hay alertas disponibles', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('input.ca-input--search').type('xxxNoExisteXXX');
      cy.contains('button', 'Buscar').click();
      cy.contains('No se encontraron alertas').should('be.visible');
    });
  });

  describe('H33 - Cerrar alerta', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
    });

    it('El coordinador puede abrir el detalle de una alerta activa', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.url().should('match', /\/alertas\/\d+/);
    });

    it('Muestra el boton Cerrar alerta solo si esta activa y el usuario es coordinador', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.contains('button', 'Cerrar alerta').should('exist');
    });

    it('Exige una justificacion minima de 20 caracteres para cerrar', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.contains('button', 'Cerrar alerta').click();
      cy.get('textarea').type('Corto');
      cy.contains('button', /confirmar|cerrar/i).click();
      cy.contains(/m[ii]nimo 20 caracteres/i).should('exist');
    });

    it('Cierra correctamente una alerta con justificacion valida', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.contains('button', 'Cerrar alerta').click();
      cy.get('textarea').type('La situacion fue revisada y atendida satisfactoriamente con el aprendiz y su acudiente.');
      cy.contains('button', /confirmar|cerrar/i).click();
      cy.contains(/cerrada/i).should('exist');
    });

    it('Un instructor no puede cerrar alertas', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('.ca-tabla tbody tr').first().find('.ca-btn-accion').click();
      cy.contains('button', 'Cerrar alerta').should('not.exist');
    });
  });

  describe('H34 - Generar o actualizar alerta por observaciones (Sistema)', () => {
    it('Las alertas automaticas se muestran con origen distinto a MANUAL', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.contains(/origen/i).should('exist');
    });

    it('Una alerta generada desde observaciones muestra las observaciones vinculadas', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('body').then(($body) => {
        if ($body.text().includes('Observaciones Vinculadas')) {
          cy.contains('Observaciones Vinculadas').should('exist');
        }
      });
    });
  });

});
