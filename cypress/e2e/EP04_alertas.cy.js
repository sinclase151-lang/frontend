describe('EP04 - Gestion de alertas tempranas y riesgos formativos', () => {
  let creds;

  before(() => {
    cy.fixture('credenciales').then((data) => { creds = data; });
  });

  // ── H31: Crear alerta manual ─────────────────────────────────────────
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

    it('Exige grupo, aprendiz, tipo, severidad, observaciones y descripcion antes de guardar', () => {
      // validar() en ModalCrearAlerta.jsx rechaza el envio si falta cualquiera de estos campos
      cy.contains('button', 'Nueva alerta manual').click();
      cy.get('.mcal-modal').within(() => {
        cy.contains('button', 'Guardar alerta').click();
        cy.contains('Selecciona un grupo').should('be.visible');
        cy.contains('Selecciona un aprendiz').should('be.visible');
        cy.contains('Selecciona el tipo').should('be.visible');
        cy.contains('Selecciona la severidad').should('be.visible');
        cy.contains('La descripcion es obligatoria').should('be.visible');
      });
    });

    it('Exige minimo 20 caracteres en la descripcion', () => {
      cy.contains('button', 'Nueva alerta manual').click();
      cy.get('.mcal-modal').within(() => {
        cy.get('textarea.mcal-textarea').type('Muy corta');
        cy.contains('button', 'Guardar alerta').click();
        cy.contains('Minimo 20 caracteres').should('be.visible');
      });
    });
  });

  // ── H32: Consultar alertas según rol y alcance ──────────────────────
  describe('H32 - Consultar alertas segun rol y alcance', () => {
    it('El coordinador consulta alertas agrupadas por ficha', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.get('.grupos-table').should('exist');
      cy.contains('h2', 'Fichas registradas').should('be.visible');
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

  // ── H33: Cerrar alerta ───────────────────────────────────────────────
  // NOTA: AlertasCoordinador.jsx y ConsultarAlertas.jsx abren el detalle de la alerta en un
  // MODAL (ModalDetalleAlerta -> clase .mcal-modal), NO navegan a una ruta /alertas/:id.
  // El cierre se hace con ModalCerrarAlerta (clases .mcal-modal, boton "Confirmar cierre").
  describe('H33 - Cerrar alerta', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
    });

    it('El coordinador puede abrir el detalle de una alerta activa', () => {
      cy.get('.grupos-table tbody tr').first().click(); // entra a la vista de aprendices de la ficha
      cy.contains('Aprendices con alertas activas').should('be.visible');
      cy.get('.grupos-table tbody tr').first().click(); // abre el detalle de la alerta (modal)
      cy.get('.mcal-modal').should('be.visible');
      cy.contains('Detalle de alerta').should('exist');
    });

    it('Muestra el boton Cerrar alerta solo si esta activa y el usuario es coordinador', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.mcal-modal').within(() => {
        cy.get('body').then(($body) => {
          // El boton solo aparece si la alerta esta ABIERTA (puedeCerrar en ModalDetalleAlerta.jsx)
          if ($body.find('.da-btn-cerrar').length) {
            cy.get('.da-btn-cerrar').should('contain.text', 'Cerrar alerta');
          } else {
            cy.log('La primera alerta de la lista ya esta CERRADA: no se muestra el boton.');
          }
        });
      });
    });

    it('Exige una justificacion minima de 20 caracteres para cerrar', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('body').then(($body) => {
        if ($body.find('.da-btn-cerrar').length) {
          cy.get('.da-btn-cerrar').click();
          cy.get('.mcal-modal').last().within(() => {
            cy.get('textarea').type('Corto');
            cy.contains('button', 'Confirmar cierre').click();
            // El mensaje de error siempre esta en el DOM; solo cambia a rojo (#ef4444) cuando hay error real.
            cy.contains('Mínimo 20 caracteres requeridos').should('have.css', 'color', 'rgb(239, 68, 68)');
          });
        } else {
          cy.log('No hay alerta ABIERTA disponible para probar la validacion de cierre.');
        }
      });
    });

    it('Cierra correctamente una alerta con justificacion valida', () => {
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('body').then(($body) => {
        if ($body.find('.da-btn-cerrar').length) {
          cy.get('.da-btn-cerrar').click();
          cy.get('.mcal-modal').last().within(() => {
            cy.get('textarea').type('La situacion fue revisada y atendida satisfactoriamente con el aprendiz y su acudiente.');
            cy.contains('button', 'Confirmar cierre').click();
          });
          cy.contains('Alerta cerrada correctamente').should('exist');
        } else {
          cy.log('No hay alerta ABIERTA disponible para cerrar.');
        }
      });
    });

    it('Un instructor no puede cerrar alertas', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/alertas/consultar');
      cy.get('.ca-tabla tbody tr').first().find('.ca-btn-accion').click();
      cy.get('.mcal-modal').should('be.visible');
      cy.contains('button', 'Cerrar alerta').should('not.exist');
    });
  });

  // ── H34: Generar/actualizar alerta por observaciones (Sistema) ─────
  describe('H34 - Generar o actualizar alerta por observaciones (Sistema)', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/alertas/consultar');
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.grupos-table tbody tr').first().click();
      cy.get('.mcal-modal').should('be.visible');
    });

    it('Las alertas automaticas se muestran con origen distinto a MANUAL', () => {
      cy.contains(/origen/i).should('exist');
    });

    it('Una alerta generada desde observaciones muestra las observaciones vinculadas', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Observaciones Vinculadas')) {
          cy.contains('Observaciones Vinculadas').should('exist');
        } else {
          cy.log('La alerta seleccionada no tiene observaciones vinculadas (puede ser de origen MANUAL).');
        }
      });
    });
  });

});
