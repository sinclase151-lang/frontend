/* global describe, before, beforeEach, it, cy */
describe('EP02 - Gestión de aprendices, grupos formativos e instructor líder', () => {
  let creds;

  before(() => {
    cy.fixture('credenciales').then((data) => { creds = data; });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('H06 - Controlar acceso por rol y alcance institucional', () => {
    it('redirige a un instructor que intenta acceder a usuarios', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/usuarios');
      cy.url().should('include', '/instructor/dashboard');
    });

    it('rechaza el acceso a rutas protegidas sin token', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('redirige al instructor fuera de fichas administrativas', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/fichas');
      cy.url().should('include', '/instructor/grupos');
    });
  });

  describe('H07 - Crear grupo formativo', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table').should('be.visible');
    });

    it('crea un grupo con datos válidos', () => {
      const ficha = `98${Date.now().toString().slice(-5)}`;

      cy.get('[data-testid="btn-abrir-crear-grupo"]').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="input-numero-grupo"]').type(ficha);
        cy.get('[data-testid="select-area-formacion"]').select(1);
        cy.get('[data-testid="select-programa-formacion"]').should('not.be.disabled').select(1);
        cy.get('[data-testid="select-jornada"]').select('Manana');
        cy.get('[data-testid="select-ambiente"]').select(1);
        cy.get('[data-testid="input-trimestres"]').type('6');
        cy.get('[data-testid="input-fecha-inicio"]').type('2026-07-01');
        cy.get('[data-testid="btn-submit-crear-grupo"]').click();
      });

      cy.contains(`Grupo ${ficha} creado correctamente`).should('be.visible');
    });

    it('impide crear un grupo con número de ficha ya existente', () => {
      cy.get('[data-testid="btn-abrir-crear-grupo"]').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="input-numero-grupo"]').type('3064975');
        cy.get('[data-testid="select-area-formacion"]').select(1);
        cy.get('[data-testid="select-programa-formacion"]').should('not.be.disabled').select(1);
        cy.get('[data-testid="select-jornada"]').select('Manana');
        cy.get('[data-testid="select-ambiente"]').select(1);
        cy.get('[data-testid="input-trimestres"]').type('6');
        cy.get('[data-testid="input-fecha-inicio"]').type('2026-07-01');
        cy.get('[data-testid="btn-submit-crear-grupo"]').click();
      });

      cy.contains(/ya esta registrado/i).should('be.visible');
    });

    it('exige los campos obligatorios del formulario', () => {
      cy.get('[data-testid="btn-abrir-crear-grupo"]').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="btn-submit-crear-grupo"]').click();
        cy.contains('small.error', 'Este campo es obligatorio').should('exist');
      });
    });

    it('rechaza creación si el usuario no es coordinador', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/fichas');
      cy.url().should('include', '/instructor/grupos');
    });
  });

  describe('H08 - Consultar y filtrar grupos formativos', () => {
    it('el coordinador consulta los grupos de sus áreas', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').should('have.length.greaterThan', 0);
    });

    it('filtra grupos por jornada', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('[data-testid="select-filtro-jornada"]').select('Manana');
      cy.get('.grupos-table tbody tr').should('exist');
    });

    it('busca grupos por código, programa o jornada', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('[data-testid="input-buscar-grupo"]').type('3064975');
      cy.get('.grupos-table tbody tr').should('contain.text', '3064975');
    });

    it('el instructor consulta únicamente sus grupos asignados', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/instructor/grupos');
      cy.get('body').should('contain.text', 'Franco');
    });
  });

  describe('H09 - Consultar detalle de grupo formativo', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
    });

    it('el coordinador consulta el detalle de un grupo', () => {
      cy.url().should('match', /\/fichas\/\d+/);
      cy.get('.gd-kpi-grid').should('be.visible');
      cy.contains('button', 'General').should('exist');
    });

    it('muestra los aprendices vinculados al grupo', () => {
      cy.contains('button', 'Aprendices').click();
      cy.get('.gd-table').should('be.visible');
    });

    it('responde adecuadamente ante un grupo inexistente', () => {
      cy.visit('/fichas/999999');
      cy.get('.fichas-detail-state').should('exist');
    });
  });

  describe('H10 - Actualizar datos básicos del grupo', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.get('.gd-kpi-grid').should('be.visible');
    });

    it('el coordinador actualiza datos básicos del grupo', () => {
      cy.contains('button', 'Editar').click();
      cy.get('select[name="jornada"]').filter(':visible').first().select('Tarde');
      cy.contains('button', 'Guardar').click();
      cy.contains('Grupo actualizado correctamente').should('be.visible');
    });

    it('recalcula la fecha de finalización al cambiar la duración', () => {
      cy.contains('button', 'Editar').click();
      cy.get('input[name="trimestres"]').filter(':visible').first().clear().type('5');
      cy.contains('button', 'Guardar').click();
      cy.contains('Fecha fin').should('exist');
    });
  });

  describe('H11 - Cambiar estado del grupo formativo', () => {
    it('impide que un instructor cambie el estado del grupo', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/instructor/grupos');
      cy.contains('button', 'Cambiar estado').should('not.exist');
    });

    it('el coordinador visualiza la acción administrativa de cambio de estado', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Cambiar estado').should('exist');
    });
  });

  describe('H12 - Asignar instructor líder a grupo', () => {
    it('muestra el instructor líder asignado en el detalle del grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().should('contain.text', 'Franco');
    });

    it('permite seleccionar instructor líder al crear el grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('[data-testid="btn-abrir-crear-grupo"]').click();
      cy.get('[data-testid="select-instructor-lider"]').should('exist');
    });

    it('rechaza la asignación de instructor líder si el usuario no es coordinador', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/fichas');
      cy.url().should('include', '/instructor/grupos');
    });
  });

  describe('H13 - Registrar aprendiz individual', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table').should('be.visible');
    });

    it('registra un aprendiz con datos válidos', () => {
      const sufijo = Date.now().toString().slice(-9);

      cy.contains('button', 'Registrar aprendiz').click();
      cy.get('.aprendices-modal').within(() => {
        cy.get('input[name="nombres"]').type('Valentina');
        cy.get('input[name="apellidos"]').type('Quintero');
        cy.get('select[name="tipo_documento"]').select('CC');
        cy.get('input[name="numero_documento"]').type(`4${sufijo}`);
        cy.get('input[name="email"]').type(`valentina.quintero.${sufijo}@misena.edu.co`);
        cy.get('select[name="numero_ficha"]').select(1);
        cy.contains('button', 'Guardar aprendiz').click();
      });

      cy.contains('Aprendiz registrado correctamente').should('be.visible');
    });

    it('valida que el documento no esté registrado previamente', () => {
      cy.contains('button', 'Registrar aprendiz').click();
      cy.get('.aprendices-modal').within(() => {
        cy.get('input[name="nombres"]').type('Mateo');
        cy.get('input[name="apellidos"]').type('Restrepo');
        cy.get('select[name="tipo_documento"]').select('CC');
        cy.get('input[name="numero_documento"]').type(creds.aprendiz.documento);
        cy.get('input[name="email"]').type(`mateo.restrepo.${Date.now()}@misena.edu.co`);
        cy.get('select[name="numero_ficha"]').select(1);
        cy.contains('button', 'Guardar aprendiz').click();
      });

      cy.get('small.error').should('exist');
    });

    it('exige los campos obligatorios', () => {
      cy.contains('button', 'Registrar aprendiz').click();
      cy.get('.aprendices-modal').within(() => {
        cy.contains('button', 'Guardar aprendiz').click();
        cy.contains('small.error', 'Campo obligatorio').should('exist');
      });
    });
  });

  describe('H14 - Registrar aprendices masivamente', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
    });

    it('abre el modal de carga masiva', () => {
      cy.contains('button', 'Carga masiva').click();
      cy.contains('Carga de archivo').should('exist');
    });

    it('exige seleccionar un archivo antes de cargar', () => {
      cy.contains('button', 'Carga masiva').click();
      cy.contains('button', 'Cargar aprendices').click();
      cy.contains('Seleccione un archivo Excel').should('be.visible');
    });

    it('solo acepta archivos .xlsx o .xls', () => {
      cy.contains('button', 'Carga masiva').click();
      cy.get('input[type="file"]').should('have.attr', 'accept', '.xlsx,.xls');
    });
  });

  describe('H15 - Consultar aprendices por grupo', () => {
    it('muestra los aprendices vinculados a un grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').should('have.length.greaterThan', 0);
    });

    it('filtra aprendices por nombre, documento, correo o grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('input[placeholder="Buscar por documento, nombre, correo o grupo"]').type('Jorge');
      cy.get('.aprendices-table tbody tr').should('contain.text', 'Jorge');
    });
  });

  describe('H16 - Consultar detalle de aprendiz', () => {
    it('muestra el detalle de un aprendiz', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').first().find('.aprendices-icon-btn').first().click();
      cy.get('.aprendices-detail-modal').should('be.visible');
    });
  });

  describe('H17 - Actualizar datos básicos del aprendiz', () => {
    it('edita los datos de un aprendiz existente', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').first().find('.aprendices-icon-btn').first().click();
      cy.contains('button', 'Editar').click();
      cy.get('input[name="telefono"]').clear().type('3009998888');
      cy.contains('button', 'Guardar cambios').click();
      cy.contains('Aprendiz actualizado correctamente').should('be.visible');
    });
  });

  describe('H18 - Desactivar aprendiz o cuenta asociada', () => {
    it('permite desactivar un aprendiz sin eliminarlo físicamente', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').last().find('.aprendices-icon-btn.danger').click();
      cy.contains('button', 'Sí').click();
      cy.contains('Aprendiz eliminado correctamente').should('exist');
    });
  });

  describe('H19 - Asignar instructores de apoyo a grupo formativo', () => {
    it('el detalle del grupo carga correctamente para el coordinador', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.get('.gd-kpi-grid').should('be.visible');
    });
  });

  describe('H20 - Consultar dashboard del instructor', () => {
    it('el instructor accede a su dashboard con resumen de grupos', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.url().should('include', '/instructor/dashboard');
      cy.get('body').should('contain.text', 'Franco');
    });

    it('el coordinador no accede al dashboard de instructor con datos propios', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.url().should('not.include', '/instructor/dashboard');
    });
  });
});
