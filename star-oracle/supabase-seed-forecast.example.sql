-- Пример: вставить прогноз на сегодня для пользователя.
-- Замените YOUR_USER_UUID на auth.users.id (JWT sub) из Table Editor или логов.

/*
INSERT INTO daily_predictions (user_id, prediction_date, payload)
VALUES (
  'YOUR_USER_UUID'::uuid,
  CURRENT_DATE,
  '{
    "vedicHint": "Титха: Двития · Накшатра: Рохини",
    "mainText": "Сегодня спокойный день для завершения дел.",
    "luckyNumber": 7,
    "luckyNumberNote": "Семёрка усиливает интуицию.",
    "favorable": ["Разговоры один на один", "Сон и отдых"],
    "avoid": ["Импульсивные покупки", "Острые споры в чатах"]
  }'::jsonb
);
*/
