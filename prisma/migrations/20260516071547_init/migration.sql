-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stravaAthleteId" INTEGER,
    "stravaAccessToken" TEXT,
    "stravaRefreshToken" TEXT,
    "stravaTokenExpiresAt" TIMESTAMP(3),
    "avgPaceSecsPerKm" INTEGER,
    "weeklyMileageKm" DOUBLE PRECISION,
    "fitnessLastUpdated" TIMESTAMP(3),
    "optimizationMode" TEXT NOT NULL DEFAULT 'finish',
    "goalFinishTimeSecs" INTEGER,
    "progressionRate" DOUBLE PRECISION,
    "injuryHistory" TEXT NOT NULL DEFAULT '',
    "coachingNotes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaActivity" (
    "id" TEXT NOT NULL,
    "stravaId" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "movingTimeSecs" INTEGER NOT NULL,
    "avgPaceSecsPerKm" DOUBLE PRECISION,
    "avgHeartRate" DOUBLE PRECISION,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StravaActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "totalKm" DOUBLE PRECISION NOT NULL,
    "focus" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TrainingWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workoutType" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "targetPaceMin" DOUBLE PRECISION,
    "targetPaceMax" DOUBLE PRECISION,
    "coachNote" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stravaActivityId" TEXT,
    "actualDistanceKm" DOUBLE PRECISION,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaAthleteId_key" ON "User"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivity_stravaId_key" ON "StravaActivity"("stravaId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPlan_userId_key" ON "TrainingPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingWeek_planId_weekNumber_key" ON "TrainingWeek"("planId", "weekNumber");

-- AddForeignKey
ALTER TABLE "StravaActivity" ADD CONSTRAINT "StravaActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingWeek" ADD CONSTRAINT "TrainingWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "TrainingWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
