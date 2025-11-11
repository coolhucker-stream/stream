using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Streaming.Migrations
{
    /// <inheritdoc />
    public partial class AddStreamTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StreamTitle",
                table: "StreamSettings",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StreamTitle",
                table: "StreamSettings");
        }
    }
}
