using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Streaming.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StreamSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StreamDescription = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    StreamKey = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StreamSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VideoStreams",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    StreamerName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    StreamUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ViewerCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    IsLive = table.Column<bool>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoStreams", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StreamSettings");

            migrationBuilder.DropTable(
                name: "VideoStreams");
        }
    }
}
