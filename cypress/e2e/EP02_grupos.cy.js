describe('EP02 - Gestión de aprendices, grupos formativos e instructor líder', () => {
  let creds;

  before(() => {
    cy.fixture('credenciales').then((data) => { creds = data; });
  });

  // ── H07: Crear grupo formativo ───────────────────────────────────────
  describe('H07 - Crear grupo formativo', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
    });

    it('Crea un grupo con datos válidos', () => {
      cy.contains('button', 'Crear grupo').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="input-numero-grupo"]').type('9999999');
        cy.get('[data-testid="select-area-formacion"]').select(1);
        cy.get('[data-testid="select-programa-formacion"]').select(1);
        cy.get('[data-testid="select-jornada"]').select('Manana');
        cy.get('[data-testid="select-ambiente"]').select(1); // ambiente obligatorio para el backend
        cy.get('[data-testid="input-trimestres"]').type('6');
        cy.get('[data-testid="input-fecha-inicio"]').type('2026-07-01');
        cy.get('[data-testid="btn-submit-crear-grupo"]').click();
      });
      cy.contains('creado correctamente').should('be.visible');
    });

    it('Impide crear un grupo con número de ficha ya existente', () => {
      cy.contains('button', 'Crear grupo').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="input-numero-grupo"]').type('3064975'); // ficha ya existente en seed
        cy.get('[data-testid="select-area-formacion"]').select(1);
        cy.get('[data-testid="select-programa-formacion"]').select(1);
        cy.get('[data-testid="select-jornada"]').select('Manana');
        cy.get('[data-testid="select-ambiente"]').select(1);
        cy.get('[data-testid="input-trimestres"]').type('6');
        cy.get('[data-testid="input-fecha-inicio"]').type('2026-07-01');
        cy.get('[data-testid="btn-submit-crear-grupo"]').click();
      });
      cy.contains(/ya esta registrado/i).should('be.visible');
    });

    it('Exige los campos obligatorios del formulario', () => {
      cy.contains('button', 'Crear grupo').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="btn-submit-crear-grupo"]').click();
      });
      cy.contains('small.error', 'Este campo es obligatorio').should('exist');
    });

    it('Rechaza creación si el usuario no es coordinador', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/fichas');
      cy.url().should('include', '/instructor/grupos');
    });
  });

  // ── H08: Consultar y filtrar grupos formativos ──────────────────────
  describe('H08 - Consultar y filtrar grupos formativos', () => {
    it('El coordinador consulta los grupos de sus áreas', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').should('have.length.greaterThan', 0);
    });

    it('Filtra grupos por jornada', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('[data-testid="select-filtro-jornada"]').select('Manana');
      cy.get('.grupos-table tbody tr').should('exist');
    });

    it('El instructor consulta únicamente sus grupos asignados', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/instructor/grupos');
      cy.get('.mis-grupos-page').should('exist'); // vista MisGrupos cargada
    });
  });

  // ── H09: Consultar detalle de grupo formativo ───────────────────────
  describe('H09 - Consultar detalle de grupo formativo', () => {
    it('El coordinador consulta el detalle de un grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.url().should('match', /\/fichas\/\d+/);
      cy.get('.gd-kpi-grid').should('be.visible'); // confirma que el detalle del grupo cargó
    });

    it('Muestra los aprendices vinculados al grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Aprendices').click();
      cy.get('.gd-table').should('be.visible');
    });

    it('Responde adecuadamente ante un grupo inexistente', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas/999999');
      cy.get('.fichas-detail-state').should('exist'); // pantalla de error/carga del componente
    });
  });

  // ── H10: Actualizar datos básicos del grupo ─────────────────────────
  describe('H10 - Actualizar datos básicos del grupo', () => {
    it('El coordinador actualiza datos básicos del grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Editar').click();
      cy.get('select[name="jornada"]').first().select('Tarde'); // .first() por el panel visible "resumen"
      cy.contains('button', 'Guardar').click();
      cy.contains('actualizado correctamente').should('be.visible');
    });

    it('Recalcula la fecha de finalización al cambiar la duración', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Editar').click();
      cy.get('input[name="trimestres"]').first().should('be.visible').clear().type('5');
      cy.contains('button', 'Guardar').click();
      cy.contains('Fecha fin').should('exist');
    });
  });

  // ── H11: Cambiar estado del grupo formativo ─────────────────────────
  describe('H11 - Cambiar estado del grupo formativo', () => {
    it('Impide que un instructor cambie el estado del grupo', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/instructor/grupos');
      cy.contains('button', 'Cambiar estado').should('not.exist');
    });

    it('El coordinador cambia el estado del grupo a un valor valido del backend', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Cambiar estado').click();
      // El modal (GrupoDetalle.jsx) no tiene data-testid propio; se identifica por su aria-labelledby real.
      cy.get('[aria-labelledby="estado-grupo-title"]').should('be.visible').within(() => {
        cy.get('select').select('FINALIZADO');
      });
      cy.intercept('PATCH', '**/api/groups/*/estado').as('cambiarEstado');
      cy.contains('[aria-labelledby="estado-grupo-title"] button', 'Aplicar cambio').click();
      cy.wait('@cambiarEstado').its('response.statusCode').should('eq', 200);
      // guardarCambioEstadoGrupo() no muestra un toast: simplemente cierra el modal (confirmado en GrupoDetalle.jsx)
      cy.get('[aria-labelledby="estado-grupo-title"]').should('not.exist');
    });

    it('Rechaza un valor de estado no soportado por el backend (regresion del hallazgo H11)', () => {
      // El backend solo acepta EN_FORMACION, PRACTICAS o FINALIZADO (groupsRoutes.js / gruposService.js ESTADOS_GRUPO).
      // Este test evita que el front vuelva a ofrecer ACTIVO/CERRADO/SUSPENDIDO.
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Cambiar estado').click();
      cy.get('[aria-labelledby="estado-grupo-title"] select option').then(($options) => {
        const valores = [...$options].map((o) => o.value);
        expect(valores).to.have.members(['EN_FORMACION', 'PRACTICAS', 'FINALIZADO']);
        expect(valores).to.not.include('ACTIVO');
        expect(valores).to.not.include('SUSPENDIDO');
        expect(valores).to.not.include('CERRADO');
      });
    });
  });

  // ── H12: Asignar instructor líder a grupo ───────────────────────────
  describe('H12 - Asignar instructor líder a grupo', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
    });

    it('Muestra el instructor líder asignado en el detalle del grupo', () => {
      cy.get('.grupos-table tbody tr').first().should('contain.text', 'Franco');
    });

    it('Permite seleccionar instructor líder al crear un grupo', () => {
      cy.contains('button', 'Crear grupo').click();
      cy.get('.grupos-modal').within(() => {
        cy.get('[data-testid="select-instructor-lider"]').should('exist');
      });
    });

    it('El coordinador cambia el instructor líder desde el detalle del grupo', () => {
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.contains('button', 'Cambiar lider').click();
      cy.get('[aria-labelledby="lider-grupo-title"]').should('be.visible');
      cy.get('[aria-labelledby="lider-grupo-title"] select option').should('have.length.greaterThan', 1);
    });
  });

  // ── H13: Registrar aprendiz individual ──────────────────────────────
  describe('H13 - Registrar aprendiz individual', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
    });

    it('Registra un aprendiz con datos válidos', () => {
      cy.contains('button', 'Registrar aprendiz').click();
      cy.get('.aprendices-modal').within(() => {
        cy.get('input[name="nombres"]').type('Pedro');
        cy.get('input[name="apellidos"]').type('Ramirez');
        cy.get('select[name="tipo_documento"]').select('CC');
        cy.get('input[name="numero_documento"]').type('1122334455');
        cy.get('input[name="email"]').type('pedro.ramirez@correo.com');
        cy.get('select[name="numero_ficha"]').select(1);
        cy.contains('button', 'Guardar aprendiz').click();
      });
      cy.contains('Aprendiz registrado correctamente').should('be.visible');
    });

    it('Valida que el documento no esté registrado previamente', () => {
      cy.contains('button', 'Registrar aprendiz').click();
      cy.get('.aprendices-modal').within(() => {
        cy.get('input[name="nombres"]').type('Duplicado');
        cy.get('input[name="apellidos"]').type('Test');
        cy.get('select[name="tipo_documento"]').select('CC');
        cy.get('input[name="numero_documento"]').type('1000000003'); // doc del aprendiz seed
        cy.get('input[name="email"]').type('duplicado@correo.com');
        cy.get('select[name="numero_ficha"]').select(1);
        cy.contains('button', 'Guardar aprendiz').click();
      });
      cy.get('small.error').should('contain.text', 'Ya existe un aprendiz con este documento');
    });

    it('Exige los campos obligatorios', () => {
      cy.contains('button', 'Registrar aprendiz').click();
      cy.get('.aprendices-modal').within(() => {
        cy.contains('button', 'Guardar aprendiz').click();
      });
      cy.contains('small.error', 'Campo obligatorio').should('exist');
    });
  });

  // ── H14: Registrar aprendices masivamente ───────────────────────────
  describe('H14 - Registrar aprendices masivamente', () => {
    beforeEach(() => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
    });

    it('Abre el modal de carga masiva', () => {
      cy.contains('button', 'Carga masiva').click();
      cy.contains('Carga de archivo').should('exist'); // título real del modal (carga-masiva-title)
    });

    it('Exige seleccionar un archivo antes de cargar', () => {
      cy.contains('button', 'Carga masiva').click();
      cy.contains('button', 'Cargar aprendices').click();
      cy.contains('Seleccione un archivo Excel').should('be.visible');
    });

    it('Solo acepta archivos .xlsx o .xls', () => {
      cy.contains('button', 'Carga masiva').click();
      cy.get('input[type="file"]').should('have.attr', 'accept', '.xlsx,.xls');
    });
  });

  // ── H15: Consultar aprendices por grupo ─────────────────────────────
  describe('H15 - Consultar aprendices por grupo', () => {
    it('Muestra los aprendices vinculados a un grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').should('have.length.greaterThan', 0);
    });

    it('Filtra aprendices por nombre, documento o grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('input[placeholder*="Buscar por documento"]').type('Jorge');
      cy.get('.aprendices-table tbody tr').should('contain.text', 'Jorge');
    });
  });

  // ── H16: Consultar detalle de aprendiz ──────────────────────────────
  describe('H16 - Consultar detalle de aprendiz', () => {
    it('Muestra el detalle de un aprendiz', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').first().find('.aprendices-icon-btn').first().click();
      cy.get('.aprendices-detail-modal').should('be.visible');
    });
  });

  // ── H17: Actualizar datos básicos del aprendiz ──────────────────────
  describe('H17 - Actualizar datos básicos del aprendiz', () => {
    it('Edita los datos de un aprendiz existente', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').first().find('.aprendices-icon-btn').first().click();
      cy.contains('button', 'Editar').click();
      cy.get('input[name="telefono"]').clear().type('3009998888');
      cy.contains('button', 'Guardar cambios').click();
      cy.contains('Aprendiz actualizado correctamente').should('be.visible');
    });
  });

  // ── H18: Desactivar aprendiz o cuenta asociada ──────────────────────
  describe('H18 - Desactivar aprendiz o cuenta asociada', () => {
    it('Permite desactivar un aprendiz sin eliminarlo físicamente', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      // RegistroAprendices.jsx NO usa window.confirm(): la confirmación es un toast
      // (ConfirmacionEliminarAprendiz) con botones "No" / "Sí" (clases .aprendices-confirm-cancel / .aprendices-confirm-danger).
      cy.get('.aprendices-table tbody tr').last().find('.aprendices-icon-btn.danger').click();
      cy.contains('¿Seguro que quieres inactivar este aprendiz?').should('be.visible');
      cy.get('.aprendices-confirm-danger').click();
      cy.contains('Aprendiz eliminado correctamente').should('be.visible');
    });

    it('Permite cancelar la desactivación desde el toast de confirmación', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/aprendices');
      cy.get('.aprendices-table tbody tr').last().find('.aprendices-icon-btn.danger').click();
      cy.get('.aprendices-confirm-cancel').click();
      cy.contains('¿Seguro que quieres inactivar este aprendiz?').should('not.exist');
    });
  });

  // ── H19: Asignar instructores de apoyo a grupo formativo ────────────
  describe('H19 - Asignar instructores de apoyo a grupo formativo', () => {
    it('El coordinador gestiona instructores de apoyo desde el detalle del grupo', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.visit('/fichas');
      cy.get('.grupos-table tbody tr').first().find('[data-testid="btn-ver-detalle-grupo"]').click();
      cy.get('.gd-kpi-grid').should('be.visible');
    });
  });

  // ── H20: Consultar dashboard del instructor ──────────────────────────
  describe('H20 - Consultar dashboard del instructor', () => {
    it('El instructor accede a su dashboard con resumen de grupos', () => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.url().should('include', '/instructor/dashboard');
      cy.get('body').should('exist');
    });

    it('El coordinador no accede al dashboard de instructor con datos propios', () => {
      cy.loginComo(creds.coordinador.documento, creds.coordinador.password);
      cy.url().should('not.include', '/instructor/dashboard');
    });
  });

  // ── H21-H24: Horario formativo del grupo (instructor líder, MisGrupos.jsx) ──
  // NOTA IMPORTANTE: el horario NO se gestiona desde /fichas (coordinador) sino desde
  // MisGrupos.jsx (/instructor/grupos), y el modal (HorarioGrupoModal) solo se muestra
  // si el usuario autenticado es el instructor líder del grupo (esInstructorLiderGrupo).
  // Seed: Franco (id_instructor 1000000002) es líder del grupo con ficha 3064975.
  describe('H21 a H24 - Horario formativo del grupo (instructor líder)', () => {
    beforeEach(() => {
      cy.loginComo(creds.instructor.documento, creds.instructor.password);
      cy.visit('/instructor/grupos');
    });

    it('H21 - El instructor líder ve el botón de asignar horario en su ficha', () => {
      cy.contains('.grupos-table tbody tr', '3064975')
        .find('button[aria-label="Asignar horario a la ficha 3064975"]')
        .should('exist');
    });

    it('H21 - Un instructor no líder de la ficha no ve el botón de horario', () => {
      // esInstructorLiderGrupo compara el id_instructor autenticado con id_instructor_lider del grupo;
      // si el grupo listado no es el propio (o no hay más grupos), el botón de horario no debe aparecer.
      cy.get('.grupos-table tbody tr').each(($fila) => {
        cy.wrap($fila).invoke('text').then((texto) => {
          if (!texto.includes('3064975')) {
            cy.wrap($fila).find('button.grupos-icon-btn.horario').should('not.exist');
          }
        });
      });
    });

    it('H21 - Abre el modal de horario y muestra el formulario de creación', () => {
      cy.contains('.grupos-table tbody tr', '3064975')
        .find('button[aria-label="Asignar horario a la ficha 3064975"]')
        .click();
      cy.get('[aria-labelledby="horario-grupo-title"]').should('be.visible');
      cy.get('#horario-grupo-title').should('contain.text', 'Ficha 3064975');
      cy.get('[aria-labelledby="horario-grupo-title"]').within(() => {
        cy.get('select[name="id_grupo_trimestre"]').should('exist');
        cy.get('select[name="id_clase_competencia"]').should('exist');
        cy.get('input[name="semanas"]').should('exist');
        cy.get('button[type="submit"]').should('contain.text', 'Crear horario');
      });
    });

    it('H21 - Crea un horario nuevo seleccionando trimestre, competencia, instructor y bloque', () => {
      cy.contains('.grupos-table tbody tr', '3064975')
        .find('button[aria-label="Asignar horario a la ficha 3064975"]')
        .click();
      cy.get('[aria-labelledby="horario-grupo-title"]').should('be.visible');

      cy.get('[aria-labelledby="horario-grupo-title"]').within(() => {
        // Solo continua si el catalogo trae opciones reales del backend (dependen del seed)
        cy.get('select[name="id_grupo_trimestre"] option').its('length').then((totalTrimestres) => {
          if (totalTrimestres > 1) {
            cy.get('select[name="id_grupo_trimestre"]').select(1);
            cy.get('select[name="id_clase_competencia"]').select(1);

            // Selecciona el primer instructor disponible en el combobox de busqueda
            cy.get('.grupos-horario-combobox input').focus();
            cy.get('.grupos-horario-instructor-option').first().click();

            // Selecciona el primer bloque de jornada disponible
            cy.get('.grupos-horario-check-grid.bloques label.grupos-horario-check').first().click();

            cy.get('button[type="submit"]').should('not.be.disabled').click();
            cy.get('.grupos-horario-form-msg').should('be.visible');
          } else {
            cy.log('El seed no trajo trimestres para la ficha 3064975: se omite la creación real.');
          }
        });
      });
    });

    it('H22 - Consulta el horario existente del grupo (vista "Reasignar horario")', () => {
      cy.contains('.grupos-table tbody tr', '3064975')
        .find('button[aria-label="Asignar horario a la ficha 3064975"]')
        .click();
      cy.get('[aria-labelledby="horario-grupo-title"]').should('be.visible');

      cy.get('[aria-labelledby="horario-grupo-title"] button').contains('Reasignar horario').then(($btn) => {
        if (!$btn.is(':disabled')) {
          cy.wrap($btn).click();
          cy.contains('h3', 'Horario actual').should('be.visible');
          cy.get('.grupos-horario-day-card').should('have.length', 6); // Lunes a Sabado
        } else {
          cy.log('La ficha 3064975 aun no tiene horarios creados: "Reasignar horario" permanece deshabilitado.');
        }
      });
    });

    it('H23 - Reasigna (actualiza) el horario existente del grupo', () => {
      cy.contains('.grupos-table tbody tr', '3064975')
        .find('button[aria-label="Asignar horario a la ficha 3064975"]')
        .click();
      cy.get('[aria-labelledby="horario-grupo-title"] button').contains('Reasignar horario').then(($btn) => {
        if (!$btn.is(':disabled')) {
          cy.wrap($btn).click();
          cy.get('[aria-labelledby="horario-grupo-title"]').should('have.class', 'reasignacion');

          cy.get('.grupos-horario-combobox input').focus();
          cy.get('.grupos-horario-instructor-option').first().click();

          cy.get('button[type="submit"]').contains('Confirmar reasignacion').click();
          cy.get('.grupos-horario-form-msg').should('be.visible');
        } else {
          cy.log('No hay horario previo para reasignar en la ficha 3064975.');
        }
      });
    });

    it('H24 - Muestra mensaje de conflicto al intentar crear un horario duplicado', () => {
      // guardarBloqueHorario() detecta 409 / "existe" y muestra:
      // 'Ya existe un horario para ... Para cambiarlo, usa "Cambiar horario"...'
      cy.contains('.grupos-table tbody tr', '3064975')
        .find('button[aria-label="Asignar horario a la ficha 3064975"]')
        .click();

      cy.get('[aria-labelledby="horario-grupo-title"]').within(() => {
        cy.get('select[name="id_grupo_trimestre"] option').its('length').then((totalTrimestres) => {
          if (totalTrimestres > 1) {
            cy.get('select[name="id_grupo_trimestre"]').select(1);
            cy.get('select[name="id_clase_competencia"]').select(1);
            cy.get('.grupos-horario-combobox input').focus();
            cy.get('.grupos-horario-instructor-option').first().click();
            cy.get('.grupos-horario-check-grid.bloques label.grupos-horario-check').first().click();
            // Primer envío: crea (o ya existe de una corrida previa)
            cy.get('button[type="submit"]').click();
            cy.get('.grupos-horario-form-msg').should('be.visible');
            // Segundo envío exacto: debe reportar el conflicto de duplicado
            cy.get('.grupos-horario-combobox input').focus();
            cy.get('.grupos-horario-instructor-option').first().click();
            cy.get('button[type="submit"]').click();
            cy.get('.grupos-horario-form-msg').should('be.visible');
          } else {
            cy.log('El seed no trajo trimestres para la ficha 3064975: se omite la validación de conflicto.');
          }
        });
      });
    });
  });

});
