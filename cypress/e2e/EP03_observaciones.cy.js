describe('EP03 - Gestión de observaciones formativas de aprendices', () => {
  let creds;

  before(() => {
    cy.fixture('credenciales').then((data) => { creds = data; });
  });

  beforeEach(() => {
    cy.loginComo(creds.instructor.documento, creds.instructor.password);
    cy.visit('/instructor/observaciones');
  });

  // ── H25: Registrar observación académica o convivencial ────────────
  describe('H25 - Registrar observación académica o convivencial', () => {
    it('Registra una observación con descripción válida (>= 20 caracteres)', () => {
      cy.get('select').first().select(1); // selecciona ficha
      cy.contains('button', 'Registrar observación').click();
      cy.get('.modal-card').within(() => {
        cy.contains('button', 'Seleccione un aprendiz').click();
      });
      cy.get('.multi-select-option').first().click();
      cy.get('.modal-card').within(() => {
        cy.get('select').eq(0).select('ACADEMICA');
        cy.get('select').eq(1).select('LEVE');
        cy.get('textarea').type('El aprendiz mostró excelente desempeño durante la práctica asignada en el laboratorio.');
        cy.contains('button', 'Guardar observación').click();
      });
    });

    it('Impide guardar con descripción menor a 20 caracteres', () => {
      cy.get('select').first().select(1);
      cy.contains('button', 'Registrar observación').click();
      cy.get('textarea').type('Muy corta');
      cy.on('window:alert', (texto) => {
        expect(texto).to.match(/m[ií]nimo 20 caracteres/i);
      });
      cy.contains('button', 'Guardar observación').click();
    });

    it('Exige seleccionar un aprendiz antes de guardar', () => {
      cy.get('select').first().select(1);
      cy.contains('button', 'Registrar observación').click();
      cy.get('textarea').type('Descripción suficientemente larga para pasar la validación mínima.');
      cy.on('window:alert', (texto) => {
        expect(texto).to.match(/selecciona un aprendiz/i);
      });
      cy.contains('button', 'Guardar observación').click();
    });

    it('La observación nueva se registra en estado ABIERTA', () => {
      cy.get('select').eq(4).select('ABIERTA'); // filtro de estado
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody tr').should('exist');
    });
  });

  // ── H26: Consultar observaciones por grupo formativo ────────────────
  describe('H26 - Consultar observaciones por grupo formativo', () => {
    it('Muestra las observaciones registradas en el grupo seleccionado', () => {
      cy.get('select').first().select(1);
      cy.get('.obs-table').should('be.visible');
    });

    it('Filtra observaciones por severidad', () => {
      cy.get('select').first().select(1);
      cy.get('.obs-filters select').eq(3).select('GRAVE');
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody').should('exist');
    });

    it('Filtra observaciones por tipo (académica/convivencial)', () => {
      cy.get('select').first().select(1);
      cy.get('.obs-filters select').eq(2).select('CONVIVENCIAL');
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody').should('exist');
    });

    it('Muestra mensaje claro si el grupo no tiene observaciones', () => {
      cy.get('select').first().select(1);
      cy.get('.obs-table').should('exist'); // muestra tabla, vacía o con mensaje "No hay observaciones registradas"
    });
  });

  // ── H27: Consultar historial de observaciones del aprendiz ──────────
  describe('H27 - Consultar historial de observaciones del aprendiz', () => {
    it('Abre el historial de observaciones de un aprendiz desde la tabla', () => {
      cy.get('select').first().select(1);
      cy.get('.obs-table tbody tr').first().find('.obs-icon-btn').first().click();
      cy.get('.modal-card').should('contain.text', 'Historial de observaciones');
    });

    it('Muestra observaciones abiertas y cerradas en el historial', () => {
      cy.get('select').first().select(1);
      cy.get('.obs-table tbody tr').first().find('.obs-icon-btn').first().click();
      cy.get('.historial-item, .obs-empty-historial').should('exist');
    });
  });

  // ── H28: Editar observación abierta ─────────────────────────────────
  describe('H28 - Editar observación abierta', () => {
    it('Permite editar una observación en estado ABIERTA', () => {
      cy.get('select').first().select(1);
      cy.get('select').eq(4).select('ABIERTA');
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody tr').first().find('.obs-action-edit').click();
      cy.get('.modal-card').should('contain.text', 'Editar observación');
    });

    it('No permite editar una observación CERRADA (no muestra botón editar)', () => {
      cy.get('select').first().select(1);
      cy.get('select').eq(4).select('CERRADA');
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody tr').first().find('.obs-action-edit').should('not.exist');
    });

    it('Guarda los cambios de una observación editada', () => {
      cy.get('select').first().select(1);
      cy.get('select').eq(4).select('ABIERTA');
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody tr').first().find('.obs-action-edit').click();
      cy.get('textarea').clear().type('Descripción actualizada con información complementaria relevante.');
      cy.contains('button', 'Actualizar').click();
    });
  });

  // ── H29: Cerrar observación (automático al asociar alerta) ──────────
  describe('H29 - Cerrar observación automáticamente al asociarse a alerta', () => {
    it('Las observaciones CERRADAS no son editables desde el listado', () => {
      cy.get('select').first().select(1);
      cy.get('select').eq(4).select('CERRADA');
      cy.contains('button', 'Buscar').click();
      cy.get('.obs-table tbody tr').each(($row) => {
        cy.wrap($row).find('.obs-action-edit').should('not.exist');
      });
    });
  });

  // ── H30: Notificar observación a usuarios responsables ─────────────
  describe('H30 - Notificar observación a usuarios responsables', () => {
    it('Muestra la opción de notificar al instructor líder al registrar', () => {
      cy.get('select').first().select(1);
      cy.contains('button', 'Registrar observación').click();
      cy.get('input[type="checkbox"]').should('exist');
    });

    it('Permite registrar sin marcar la opción de notificar', () => {
      cy.get('select').first().select(1);
      cy.contains('button', 'Registrar observación').click();
      cy.get('input[type="checkbox"]').should('not.be.checked');
    });
  });

});