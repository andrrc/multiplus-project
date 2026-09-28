GRANT UPDATE, DELETE ON "etiquetas" TO multiplus_app;

CREATE POLICY etiquetas_update ON "etiquetas"
  FOR UPDATE
  USING (app_current_perfil() = 'ADMIN')
  WITH CHECK (app_current_perfil() = 'ADMIN');

CREATE POLICY etiquetas_delete ON "etiquetas"
  FOR DELETE
  USING (app_current_perfil() = 'ADMIN');
