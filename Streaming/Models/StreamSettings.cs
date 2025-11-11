using System.ComponentModel.DataAnnotations;

namespace Streaming.Models
{
    public class StreamSettings
    {
        public int Id { get; set; }

        [Required]
        [StringLength(1000)]
        public string StreamDescription { get; set; }

        [Required]
        [StringLength(255)]
        public string StreamKey { get; set; }

        [Required]
        [StringLength(200)]
        public string StreamTitle { get; set; }
    }
}