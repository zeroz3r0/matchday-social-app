-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('ADMIN', 'CAPTAIN', 'PLAYER');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('F5', 'F7', 'F11');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "StatValidationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED', 'AUTO_CONFIRMED');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "TournamentStage" AS ENUM ('ROUND_OF_64', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" VARCHAR(24) NOT NULL,
    "avatar_url" TEXT,
    "position" "PlayerPosition" NOT NULL,
    "bio" VARCHAR(280),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "city" VARCHAR(100),
    "fcm_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "badge_url" TEXT,
    "description" VARCHAR(500),
    "preferred_formation" VARCHAR(20),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'PLAYER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "game_type" "GameType" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "location_name" VARCHAR(200) NOT NULL,
    "location_address" VARCHAR(500) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contact_phone" VARCHAR(20),
    "google_place_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "voting_deadline" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "competition_id" TEXT,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_teams" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "club_id" TEXT,
    "name" VARCHAR(60) NOT NULL,
    "is_home" BOOLEAN NOT NULL,

    CONSTRAINT "match_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "id" TEXT NOT NULL,
    "match_team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position" "PlayerPosition" NOT NULL,
    "invitation_status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "match_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_stats" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "submitted_by_id" TEXT NOT NULL,
    "validation_status" "StatValidationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmations_count" INTEGER NOT NULL DEFAULT 0,
    "required_confirmations" INTEGER NOT NULL,
    "auto_confirm_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stat_confirmations" (
    "id" TEXT NOT NULL,
    "match_stat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stat_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_votes" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "target_player_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "is_mvp_vote" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mvp_results" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "home_team_mvp_id" TEXT NOT NULL,
    "away_team_mvp_id" TEXT NOT NULL,
    "global_mvp_id" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mvp_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "type" "CompetitionType" NOT NULL,
    "game_type" "GameType" NOT NULL,
    "description" VARCHAR(1000),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "max_postpone_days" INTEGER NOT NULL DEFAULT 14,
    "created_by_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_clubs" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_standings" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "league_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_brackets" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "match_order" INTEGER NOT NULL,
    "match_id" TEXT,
    "home_club_id" TEXT,
    "away_club_id" TEXT,
    "is_bypass" BOOLEAN NOT NULL DEFAULT false,
    "winner_id" TEXT,

    CONSTRAINT "tournament_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_name_key" ON "clubs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_club_id_user_id_key" ON "club_members"("club_id", "user_id");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_scheduled_at_idx" ON "matches"("scheduled_at");

-- CreateIndex
CREATE INDEX "matches_competition_id_idx" ON "matches"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_teams_match_id_is_home_key" ON "match_teams"("match_id", "is_home");

-- CreateIndex
CREATE UNIQUE INDEX "match_players_match_team_id_user_id_key" ON "match_players"("match_team_id", "user_id");

-- CreateIndex
CREATE INDEX "match_stats_validation_status_idx" ON "match_stats"("validation_status");

-- CreateIndex
CREATE INDEX "match_stats_auto_confirm_at_idx" ON "match_stats"("auto_confirm_at");

-- CreateIndex
CREATE UNIQUE INDEX "match_stats_match_id_player_id_key" ON "match_stats"("match_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "stat_confirmations_match_stat_id_user_id_key" ON "stat_confirmations"("match_stat_id", "user_id");

-- CreateIndex
CREATE INDEX "player_votes_match_id_idx" ON "player_votes"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_votes_match_id_voter_id_target_player_id_key" ON "player_votes"("match_id", "voter_id", "target_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "mvp_results_match_id_key" ON "mvp_results"("match_id");

-- CreateIndex
CREATE INDEX "competitions_type_idx" ON "competitions"("type");

-- CreateIndex
CREATE INDEX "competitions_city_idx" ON "competitions"("city");

-- CreateIndex
CREATE UNIQUE INDEX "competition_clubs_competition_id_club_id_key" ON "competition_clubs"("competition_id", "club_id");

-- CreateIndex
CREATE INDEX "league_standings_competition_id_points_idx" ON "league_standings"("competition_id", "points" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "league_standings_competition_id_club_id_key" ON "league_standings"("competition_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_brackets_competition_id_stage_match_order_key" ON "tournament_brackets"("competition_id", "stage", "match_order");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_team_id_fkey" FOREIGN KEY ("match_team_id") REFERENCES "match_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stat_confirmations" ADD CONSTRAINT "stat_confirmations_match_stat_id_fkey" FOREIGN KEY ("match_stat_id") REFERENCES "match_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stat_confirmations" ADD CONSTRAINT "stat_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_votes" ADD CONSTRAINT "player_votes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_votes" ADD CONSTRAINT "player_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_votes" ADD CONSTRAINT "player_votes_target_player_id_fkey" FOREIGN KEY ("target_player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mvp_results" ADD CONSTRAINT "mvp_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_clubs" ADD CONSTRAINT "competition_clubs_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_clubs" ADD CONSTRAINT "competition_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_home_club_id_fkey" FOREIGN KEY ("home_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_away_club_id_fkey" FOREIGN KEY ("away_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
