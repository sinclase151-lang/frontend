/* global describe, before, beforeEach, it, cy, expect */
describe('EP01 - Gestión de usuarios, autenticación y control de acceso por roles', () => {
  let creds;

  before(() => {
    cy.fixture('credenciales').then((data) => { creds = data; });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('H01 - Crear usuario institucional', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/usuarios');
      cy.get('[data-testid="users-table"]').should('be.visible');
    });

    it('crea un usuario institucional con datos válidos', () => {
      const sufijo = Date.now().toString().slice(-9);

      cy.contains('button', 'Crear usuario').click();
      cy.get('.usuarios-modal').within(() => {
        cy.get('input[placeholder="Ej. Maria"]').type('James David');
        cy.get('input[placeholder="Ej. Torres"]').type('Rodriguez Peña');
        cy.get('select').eq(0).select('CC');
        cy.get('input[placeholder="Numero de cedula"]').type(`2${sufijo}`);
        cy.get('input[placeholder="usuario@misena.edu.co"]').type(`james.rodriguez.${sufijo}@misena.edu.co`);
        cy.get('input[placeholder="Numero de celular"]').type('3001234567');
        cy.get('select').eq(1).select('instructor');
        cy.contains('button', 'Guardar usuario').click();
      });

      cy.contains('Usuario creado correctamente').should('be.visible');
      cy.get('[data-testid="users-table"]').should('contain.text', 'James David');
    });

    it('impide crear usuario con documento ya registrado', () => {
      cy.contains('button', 'Crear usuario').click();
      cy.get('.usuarios-modal').within(() => {
        cy.get('input[placeholder="Ej. Maria"]').type('Daniel');
        cy.get('input[placeholder="Ej. Torres"]').type('Mbappé');
        cy.get('select').eq(0).select('CC');
        cy.get('input[placeholder="Numero de cedula"]').type(creds.coordinador.documento);
        cy.get('input[placeholder="usuario@misena.edu.co"]').type(`daniel.mbappe.${Date.now()}@misena.edu.co`);
        cy.get('input[placeholder="Numero de celular"]').type('3009999999');
        cy.get('select').eq(1).select('instructor');
        cy.contains('button', 'Guardar usuario').click();
      });

      cy.get('.usuarios-alert.info').should('be.visible');
    });

    it('impide crear usuario con correo ya registrado', () => {
      cy.contains('button', 'Crear usuario').click();
      cy.get('.usuarios-modal').within(() => {
        cy.get('input[placeholder="Ej. Maria"]').type('Camila');
        cy.get('input[placeholder="Ej. Torres"]').type('Osorio');
        cy.get('select').eq(0).select('CC');
        cy.get('input[placeholder="Numero de cedula"]').type(`3${Date.now().toString().slice(-9)}`);
        cy.get('input[placeholder="usuario@misena.edu.co"]').type('coordinador@sena.edu.co');
        cy.get('input[placeholder="Numero de celular"]').type('3007777777');
        cy.get('select').eq(1).select('instructor');
        cy.contains('button', 'Guardar usuario').click();
      });

      cy.get('.usuarios-alert.info').should('be.visible');
    });

    it('exige campos obligatorios antes de permitir el registro', () => {
      cy.contains('button', 'Crear usuario').click();
      cy.get('.usuarios-modal').within(() => {
        cy.contains('button', 'Guardar usuario').click();
        cy.get('input[placeholder="Ej. Maria"]:invalid').should('exist');
        cy.get('input[placeholder="Ej. Torres"]:invalid').should('exist');
        cy.get('input[placeholder="Numero de cedula"]:invalid').should('exist');
      });
    });

    it('el formulario del coordinador solo ofrece roles instructor y aprendiz', () => {
      cy.contains('button', 'Crear usuario').click();
      cy.get('.usuarios-modal select').eq(1).find('option').then(($options) => {
        const roles = [...$options].map((option) => option.textContent.toLowerCase());
        expect(roles.join(' ')).to.contain('instructor');
        expect(roles.join(' ')).to.contain('aprendiz');
        expect(roles.join(' ')).not.to.contain('super');
        expect(roles.join(' ')).not.to.contain('coordinador');
      });
    });
  });

  describe('H02 - Consultar y filtrar usuarios', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/usuarios');
      cy.get('[data-testid="users-table"]').should('be.visible');
    });

    it('muestra el listado de usuarios registrados', () => {
      cy.get('[data-testid="users-row"]').should('have.length.greaterThan', 0);
    });

    it('filtra usuarios por nombre, documento o correo', () => {
      cy.get('input[placeholder="Buscar por nombre, documento o correo"]').type('Franco{enter}');
      cy.get('[data-testid="users-table"] tbody tr').should('contain.text', 'Franco');
    });

    it('muestra mensaje vacío cuando no hay coincidencias', () => {
      cy.get('input[placeholder="Buscar por nombre, documento o correo"]').type('SinCoincidenciasSima{enter}');
      cy.contains('No hay usuarios para mostrar').should('be.visible');
    });

    it('filtra usuarios por estado', () => {
      cy.get('[data-testid="users-filter-status"]').select('ACTIVO');
      cy.get('[data-testid="users-table"] tbody tr').each(($tr) => {
        cy.wrap($tr).find('[data-testid="users-status-badge"]').should('contain.text', 'ACTIVO');
      });
    });

    it('restringe el listado general de usuarios a usuarios sin rol de coordinador', () => {
      cy.get('[data-testid="users-table"]').should('not.contain.text', 'SUPER_ADMIN');
      cy.get('[data-testid="users-table"]').should('not.contain.text', 'Coordinador Area');
    });
  });

  describe('H03 - Actualizar o desactivar usuario institucional', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/usuarios');
      cy.get('[data-testid="users-table"]').should('be.visible');
    });

    it('edita los datos permitidos de un usuario existente', () => {
      cy.contains('[data-testid="users-row"]', 'Franco').find('[data-testid="users-edit-button"]').click();
      cy.get('.usuarios-detail-modal').should('be.visible');
      cy.contains('button', 'Editar').click();
      cy.get('.usuarios-detail-field input[name="apellidos"]').should('be.visible').clear().type('Valencia');
      cy.get('[data-testid="users-save-button"]').click();
      cy.contains('Usuario actualizado correctamente').should('be.visible');
    });

    it('muestra la información actualizada después de guardar', () => {
      cy.contains('[data-testid="users-row"]', 'Franco').find('[data-testid="users-edit-button"]').click();
      cy.get('.usuarios-detail-modal').should('be.visible');
      cy.contains('button', 'Editar').click();
      cy.get('.usuarios-detail-field input[name="apellidos"]').clear().type('Ortiz');
      cy.get('[data-testid="users-save-button"]').click();
      cy.contains('Usuario actualizado correctamente').should('be.visible');
      cy.get('.usuarios-detail-modal').should('contain.text', 'Ortiz');
    });

    it('desactiva un usuario existente sin eliminar físicamente la información', () => {
      cy.on('window:confirm', () => true);
      cy.get('[data-testid="users-row"]').last().find('.usuarios-icon-btn.danger').click();
      cy.contains('Usuario eliminado correctamente').should('be.visible');
    });
  });

  describe('H04 - Iniciar sesión con documento y contraseña', () => {
    it('permite iniciar sesión con credenciales válidas', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.window().its('localStorage.access').should('exist');
      cy.contains(/coordinador/i).should('exist');
    });

    it('rechaza el inicio de sesión con contraseña incorrecta', () => {
      cy.visit('/login');
      cy.get('#login-user').clear().type(creds.coordinador.documento);
      cy.get('#login-password').clear().type('ClaveIncorrecta999');
      cy.contains('button', 'Iniciar sesion').click();
      cy.url().should('include', '/login');
      cy.get('.login-sima-message').should('be.visible');
    });

    it('redirige según el rol del usuario autenticado', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.url().should('include', '/instructor/dashboard');
    });
  });

  describe('H05 - Consultar perfil autenticado', () => {
    it('el usuario autenticado consulta su propio perfil con su rol real', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/perfil');
      cy.get('.perfil-page, [class*="perfil"]').should('exist');
      cy.contains(/coordinador/i).should('exist');
    });

    it('rechaza el acceso al perfil sin token válido', () => {
      cy.clearLocalStorage();
      cy.visit('/perfil');
      cy.url().should('include', '/login');
    });
  });
});
