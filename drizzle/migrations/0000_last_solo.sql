CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"trade_id" uuid NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_type" varchar(30) NOT NULL,
	"target_id" varchar(200),
	"channel" varchar(20) NOT NULL,
	"channel_config" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "politicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bioguide_id" varchar(20),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"name_kr" varchar(200),
	"party" varchar(50),
	"chamber" varchar(20) NOT NULL,
	"state" varchar(2),
	"district" integer,
	"committee" text,
	"slug" varchar(200) NOT NULL,
	"photo_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "politicians_bioguide_id_unique" UNIQUE("bioguide_id")
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"name_en" varchar(300) NOT NULL,
	"name_kr" varchar(300),
	"sector" varchar(100),
	"industry" varchar(150),
	"current_price" numeric(12, 4),
	"price_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stocks_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"politician_id" uuid NOT NULL,
	"stock_id" uuid,
	"stock_ticker" varchar(20) NOT NULL,
	"stock_name" varchar(300),
	"trade_type" varchar(10) NOT NULL,
	"amount_range" varchar(100),
	"amount_min" numeric(15, 2),
	"amount_max" numeric(15, 2),
	"trade_date" date,
	"disclosure_date" date NOT NULL,
	"filing_url" text,
	"filing_id" varchar(100),
	"comment" text,
	"price_at_disclosure" numeric(12, 4),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"subscription_tier" varchar(20) DEFAULT 'free',
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100),
	"subscription_ends_at" timestamp,
	"is_email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_politician_id_politicians_id_fk" FOREIGN KEY ("politician_id") REFERENCES "public"."politicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_deliveries_alert_trade_unique" ON "alert_deliveries" USING btree ("alert_id","trade_id");--> statement-breakpoint
CREATE INDEX "alerts_user_idx" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alerts_type_target_idx" ON "alerts" USING btree ("alert_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "politicians_slug_chamber_unique" ON "politicians" USING btree ("slug","chamber");--> statement-breakpoint
CREATE INDEX "trades_politician_idx" ON "trades" USING btree ("politician_id");--> statement-breakpoint
CREATE INDEX "trades_stock_ticker_idx" ON "trades" USING btree ("stock_ticker");--> statement-breakpoint
CREATE INDEX "trades_trade_date_idx" ON "trades" USING btree ("trade_date");--> statement-breakpoint
CREATE INDEX "trades_disclosure_date_idx" ON "trades" USING btree ("disclosure_date");--> statement-breakpoint
CREATE UNIQUE INDEX "trades_filing_id_unique" ON "trades" USING btree ("filing_id");--> statement-breakpoint
CREATE INDEX "trades_disclosure_trade_type_idx" ON "trades" USING btree ("disclosure_date","trade_type");--> statement-breakpoint
CREATE INDEX "trades_politician_trade_type_idx" ON "trades" USING btree ("politician_id","trade_type");--> statement-breakpoint
CREATE INDEX "magic_links_token_idx" ON "magic_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "magic_links_user_idx" ON "magic_links" USING btree ("user_id");